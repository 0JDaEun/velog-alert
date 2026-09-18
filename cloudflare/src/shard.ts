import { DurableObject } from "cloudflare:workers";
import { decryptJson, encryptJson, randomToken, sha256 } from "./crypto";
import { sendEventToDevices } from "./push";
import {
  DEFAULT_ALERT_SETTINGS,
  type AccountRecord,
  type AlertSettings,
  type Env,
  type MobileEvent,
  type PushSubscriptionJSON,
} from "./types";
import {
  feedPostToEvent,
  fetchVelogSnapshot,
  itemsAfterFrontier,
  makeFrontier,
  notificationToEvent,
  type VelogTokens,
} from "./velog";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const HEARTBEAT_TTL_MS = 8 * 60 * 1000;
const MAX_DEVICES = 2;
const MAX_DEDUP_KEYS = 500;

function nowIso() {
  return new Date().toISOString();
}

function defaultAccount(extensionHash: string): AccountRecord {
  const now = nowIso();

  return {
    extensionHash,
    devices: [],
    encryptedTokens: null,
    username: null,
    cloudEnabled: false,
    authStatus: "disabled",
    settings: { ...DEFAULT_ALERT_SETTINGS },
    heartbeatUntil: null,
    notificationFrontier: null,
    feedFrontier: null,
    dedupEventKeys: [],
    createdAt: now,
    updatedAt: now,
    lastCloudSuccessAt: null,
    lastCloudErrorAt: null,
  };
}

function validSubscription(value: unknown): value is PushSubscriptionJSON {
  const subscription = value as PushSubscriptionJSON;

  return Boolean(
    subscription?.endpoint &&
    subscription?.keys?.p256dh &&
    subscription?.keys?.auth,
  );
}

function validEvent(value: unknown): value is MobileEvent {
  const event = value as MobileEvent;

  return Boolean(
    event?.eventKey &&
    event?.type &&
    event?.title &&
    event?.body &&
    event?.url?.startsWith("https://velog.io/"),
  );
}

function shouldSend(event: MobileEvent, settings: AlertSettings) {
  return Boolean(settings[event.type as keyof AlertSettings]);
}

function summarizeEvents(events: MobileEvent[]): MobileEvent {
  if (events.length === 1) return events[0];

  const counts = new Map<string, number>();
  const labels: Record<string, string> = {
    comment: "댓글",
    commentReply: "답글",
    postLike: "좋아요",
    follow: "새 팔로워",
    followPost: "새 글",
  };

  for (const event of events) {
    counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
  }

  const summary = [...counts.entries()]
    .map(([type, count]) => `${labels[type] || type} ${count}`)
    .join(" · ");

  const newest = events.at(-1)!;

  return {
    eventKey: `cloudBatch:${events.map((event) => event.eventKey).join("|")}`,
    type: "cloudBatch",
    title: `Velog 새 알림 ${events.length}개`,
    body: summary,
    url: events.every((event) => event.type === "followPost")
      ? newest.url
      : "https://velog.io/notifications",
    createdAt: newest.createdAt,
  };
}

export class PollShardDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private key(extensionHash: string) {
    return `account:${extensionHash}`;
  }

  private async getAccount(extensionHash: string) {
    return (
      (await this.ctx.storage.get<AccountRecord>(this.key(extensionHash))) ??
      defaultAccount(extensionHash)
    );
  }

  private async saveAccount(account: AccountRecord) {
    account.updatedAt = nowIso();
    await this.ctx.storage.put(this.key(account.extensionHash), account);
  }

  private async listAccounts() {
    const values = await this.ctx.storage.list<AccountRecord>({
      prefix: "account:",
    });
    return [...values.values()];
  }

  private async ensureAlarm() {
    const current = await this.ctx.storage.getAlarm();
    if (current == null) {
      await this.ctx.storage.setAlarm(Date.now() + POLL_INTERVAL_MS);
    }
  }

  private async reconcileAlarm() {
    const accounts = await this.listAccounts();
    const hasCloudAccount = accounts.some(
      (account) => account.cloudEnabled && account.authStatus === "active",
    );

    if (hasCloudAccount) {
      await this.ctx.storage.setAlarm(Date.now() + POLL_INTERVAL_MS);
    } else {
      await this.ctx.storage.deleteAlarm();
    }
  }

  private rememberDedup(account: AccountRecord, eventKeys: string[]) {
    account.dedupEventKeys = [
      ...new Set([...eventKeys, ...(account.dedupEventKeys ?? [])]),
    ].slice(0, MAX_DEDUP_KEYS);
  }

  private async sendIfNew(
    account: AccountRecord,
    event: MobileEvent,
    underlyingKeys = [event.eventKey],
  ) {
    const seen = new Set(account.dedupEventKeys ?? []);

    if (underlyingKeys.every((key) => seen.has(key))) {
      return { delivered: 0, duplicate: true };
    }

    const result = await sendEventToDevices(this.env, account.devices, event);
    this.rememberDedup(account, underlyingKeys);
    return { ...result, duplicate: false };
  }

  private async pollAccount(account: AccountRecord) {
    if (!account.encryptedTokens) return;

    if (
      account.heartbeatUntil &&
      Date.parse(account.heartbeatUntil) > Date.now()
    ) {
      return;
    }

    try {
      const tokens = await decryptJson<VelogTokens>(
        account.encryptedTokens,
        this.env.AUTH_KEY,
      );
      const snapshot = await fetchVelogSnapshot(tokens);

      const newNotifications = itemsAfterFrontier(
        snapshot.notifications,
        account.notificationFrontier,
        (item) => item.id,
        (item) => item.created_at,
      );

      const newFeedPosts = itemsAfterFrontier(
        snapshot.feedPosts,
        account.feedFrontier,
        (item) => item.id,
        (item) => item.released_at || item.updated_at,
      );

      const events = [
        ...newNotifications.map(notificationToEvent),
        ...newFeedPosts.map(feedPostToEvent),
      ]
        .filter((event): event is MobileEvent => Boolean(event))
        .filter((event) => shouldSend(event, account.settings))
        .filter((event) => !(account.dedupEventKeys ?? []).includes(event.eventKey));

      if (events.length > 0) {
        const outgoing = summarizeEvents(events);
        await this.sendIfNew(
          account,
          outgoing,
          events.map((event) => event.eventKey),
        );
      }

      if (
        snapshot.tokens.accessToken !== tokens.accessToken ||
        snapshot.tokens.refreshToken !== tokens.refreshToken
      ) {
        account.encryptedTokens = await encryptJson(
          snapshot.tokens,
          this.env.AUTH_KEY,
        );
      }

      account.username = snapshot.currentUser.username;
      account.notificationFrontier = makeFrontier(
        snapshot.notifications,
        (item) => item.id,
        (item) => item.created_at,
      );
      account.feedFrontier = makeFrontier(
        snapshot.feedPosts,
        (item) => item.id,
        (item) => item.released_at || item.updated_at,
      );
      account.authStatus = "active";
      account.lastCloudSuccessAt = nowIso();
      account.lastCloudErrorAt = null;

      await this.saveAccount(account);
    } catch (error) {
      const code = (error as Error)?.message || "CLOUD_POLL_FAILED";
      account.lastCloudErrorAt = nowIso();

      if (code === "VELOG_AUTH_EXPIRED") {
        account.authStatus = "expired";
        account.cloudEnabled = false;

        try {
          await sendEventToDevices(this.env, account.devices, {
            eventKey: `cloudAuthExpired:${account.updatedAt}`,
            type: "cloudAuth",
            title: "Velog Alert 인증 갱신 필요",
            body: "Always-on 인증이 만료되었습니다. PC에서 Velog Alert 인증을 다시 연결해 주세요.",
            url: "https://velog.io/",
            createdAt: nowIso(),
          });
        } catch {}
      } else {
        account.authStatus = "error";
      }

      console.error("[poll-shard] account poll failed", {
        account: account.extensionHash.slice(0, 10),
        code,
      });

      await this.saveAccount(account);
    }
  }

  private async claimDevice(body: {
    extensionHash?: string;
    shardName?: string;
    deviceName?: string;
    subscription?: unknown;
  }) {
    if (
      !body.extensionHash ||
      !body.shardName ||
      !validSubscription(body.subscription)
    ) {
      return Response.json({ error: "INVALID_DEVICE" }, { status: 400 });
    }

    const account = await this.getAccount(body.extensionHash);
    const rawToken = `${body.shardName}.${randomToken(32)}`;
    const tokenHash = await sha256(rawToken);
    const now = nowIso();

    account.devices = [
      ...account.devices.filter((device) => device.enabled),
      {
        id: crypto.randomUUID(),
        tokenHash,
        name: (body.deviceName || "휴대폰").slice(0, 80),
        subscription: body.subscription,
        createdAt: now,
        lastSeenAt: now,
        enabled: true,
      },
    ].slice(-MAX_DEVICES);

    await this.saveAccount(account);

    const created = account.devices.at(-1)!;

    return Response.json({
      ok: true,
      deviceId: created.id,
      deviceName: created.name,
      deviceToken: rawToken,
    });
  }

  private async removeDevice(token: string) {
    const tokenHash = await sha256(token);
    const accounts = await this.listAccounts();

    for (const account of accounts) {
      const before = account.devices.length;
      account.devices = account.devices.filter(
        (device) => device.tokenHash !== tokenHash,
      );

      if (account.devices.length !== before) {
        await this.saveAccount(account);
        return Response.json({ ok: true });
      }
    }

    return Response.json({ error: "DEVICE_NOT_FOUND" }, { status: 404 });
  }

  private async enableCloudAuth(
    extensionHash: string,
    body: {
      accessToken?: string | null;
      refreshToken?: string;
      settings?: Partial<AlertSettings>;
    },
  ) {
    if (!body.refreshToken) {
      return Response.json({ error: "REFRESH_TOKEN_REQUIRED" }, { status: 400 });
    }

    try {
      const snapshot = await fetchVelogSnapshot({
        accessToken: body.accessToken || null,
        refreshToken: body.refreshToken,
      });

      const account = await this.getAccount(extensionHash);
      const now = nowIso();

      account.encryptedTokens = await encryptJson(
        snapshot.tokens,
        this.env.AUTH_KEY,
      );
      account.username = snapshot.currentUser.username;
      account.cloudEnabled = true;
      account.authStatus = "active";
      account.settings = {
        ...account.settings,
        ...(body.settings ?? {}),
      };
      account.notificationFrontier = makeFrontier(
        snapshot.notifications,
        (item) => item.id,
        (item) => item.created_at,
      );
      account.feedFrontier = makeFrontier(
        snapshot.feedPosts,
        (item) => item.id,
        (item) => item.released_at || item.updated_at,
      );
      account.lastCloudSuccessAt = now;
      account.lastCloudErrorAt = null;

      await this.saveAccount(account);
      await this.ensureAlarm();

      return Response.json({
        ok: true,
        username: account.username,
        status: account.authStatus,
        lastSuccessAt: account.lastCloudSuccessAt,
      });
    } catch (error) {
      const code = (error as Error)?.message || "CLOUD_AUTH_ENABLE_FAILED";
      return Response.json(
        { error: code },
        { status: code === "VELOG_AUTH_EXPIRED" ? 401 : 502 },
      );
    }
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/device/claim") {
      return this.claimDevice(await request.json());
    }

    if (request.method === "DELETE" && url.pathname === "/device") {
      const token = request.headers.get("X-Device-Token")?.trim() ?? "";
      if (!token) return Response.json({ error: "DEVICE_TOKEN_REQUIRED" }, { status: 401 });
      return this.removeDevice(token);
    }

    const extensionHash = request.headers.get("X-Extension-Hash")?.trim() ?? "";
    if (!extensionHash) {
      return Response.json({ error: "ACCOUNT_REQUIRED" }, { status: 401 });
    }

    if (request.method === "GET" && url.pathname === "/devices") {
      const account = await this.getAccount(extensionHash);
      return Response.json({
        devices: account.devices.map((device) => ({
          id: device.id,
          name: device.name,
          createdAt: device.createdAt,
          lastSeenAt: device.lastSeenAt,
          enabled: device.enabled,
        })),
      });
    }

    if (request.method === "POST" && url.pathname === "/push/send") {
      const body = await request.json<{ event?: unknown }>();
      if (!validEvent(body.event)) {
        return Response.json({ error: "INVALID_EVENT" }, { status: 400 });
      }

      const account = await this.getAccount(extensionHash);
      const result = await this.sendIfNew(account, body.event);
      await this.saveAccount(account);
      return Response.json({ ok: true, ...result });
    }

    if (request.method === "POST" && url.pathname === "/cloud-auth/enable") {
      const body = await request.json<{
        accessToken?: string | null;
        refreshToken?: string;
        settings?: Partial<AlertSettings>;
      }>();
      return this.enableCloudAuth(extensionHash, body);
    }

    if (request.method === "GET" && url.pathname === "/cloud-auth/status") {
      const account = await this.getAccount(extensionHash);
      return Response.json({
        enabled: account.cloudEnabled,
        status: account.authStatus,
        username: account.username,
        lastSuccessAt: account.lastCloudSuccessAt,
        lastErrorAt: account.lastCloudErrorAt,
      });
    }

    if (request.method === "DELETE" && url.pathname === "/cloud-auth") {
      const account = await this.getAccount(extensionHash);
      account.encryptedTokens = null;
      account.cloudEnabled = false;
      account.authStatus = "disabled";
      account.notificationFrontier = null;
      account.feedFrontier = null;
      account.lastCloudSuccessAt = null;
      account.lastCloudErrorAt = null;
      await this.saveAccount(account);
      await this.reconcileAlarm();
      return Response.json({ ok: true });
    }

    if (request.method === "POST" && url.pathname === "/settings") {
      const body = await request.json<{ settings?: Partial<AlertSettings> }>();
      const account = await this.getAccount(extensionHash);
      account.settings = {
        ...account.settings,
        ...(body.settings ?? {}),
      };
      await this.saveAccount(account);
      return Response.json({ ok: true, settings: account.settings });
    }

    if (request.method === "POST" && url.pathname === "/heartbeat") {
      const account = await this.getAccount(extensionHash);
      account.heartbeatUntil = new Date(Date.now() + HEARTBEAT_TTL_MS).toISOString();
      await this.saveAccount(account);
      return Response.json({
        ok: true,
        activeUntil: account.heartbeatUntil,
      });
    }

    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  async alarm() {
    const accounts = await this.listAccounts();
    const active = accounts.filter(
      (account) => account.cloudEnabled && account.authStatus !== "expired",
    );

    for (let offset = 0; offset < active.length; offset += 5) {
      const batch = active.slice(offset, offset + 5);
      await Promise.all(batch.map((account) => this.pollAccount(account)));
    }

    await this.reconcileAlarm();
  }
}
