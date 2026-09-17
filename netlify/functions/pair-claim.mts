import type { Config, Context } from "@netlify/functions";
import { preflight, json } from "./_shared/http.mts";
import {
  randomToken,
  sha256,
  validPairingCode,
} from "./_shared/crypto.mts";
import {
  pairingStore,
  tokenStore,
  getExtensionRecord,
  saveExtensionRecord,
  type PairingRecord,
  type PushSubscriptionJSON,
} from "./_shared/stores.mts";
import { enforceMinuteRateLimit } from "./_shared/rate-limit.mts";

function validSubscription(value: unknown): value is PushSubscriptionJSON {
  const sub = value as PushSubscriptionJSON;
  return Boolean(
    sub &&
      typeof sub.endpoint === "string" &&
      sub.endpoint.startsWith("https://") &&
      typeof sub.keys?.p256dh === "string" &&
      typeof sub.keys?.auth === "string",
  );
}

export default async (req: Request, context: Context) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const allowed = await enforceMinuteRateLimit(context.ip, "pair-claim", 20);
  if (!allowed) return json({ error: "RATE_LIMITED" }, 429);

  const body = await req.json().catch(() => null);
  const code = String(body?.code ?? "").replace(/\s/g, "");
  const subscription = body?.subscription;
  const requestedName = String(body?.deviceName ?? "").trim();

  if (!validPairingCode(code)) {
    return json({ error: "INVALID_PAIRING_CODE" }, 400);
  }

  if (!validSubscription(subscription)) {
    return json({ error: "INVALID_PUSH_SUBSCRIPTION" }, 400);
  }

  const store = pairingStore();
  const key = `pair:${code}`;
  const pairing = (await store.get(key, {
    type: "json",
  })) as PairingRecord | null;

  if (!pairing) return json({ error: "PAIRING_CODE_NOT_FOUND" }, 404);

  if (Date.parse(pairing.expiresAt) <= Date.now()) {
    await store.delete(key);
    return json({ error: "PAIRING_CODE_EXPIRED" }, 410);
  }

  const attempts = (pairing.attempts ?? 0) + 1;
  if (attempts > 5) {
    await store.delete(key);
    return json({ error: "PAIRING_CODE_LOCKED" }, 429);
  }

  await store.setJSON(key, {
    ...pairing,
    attempts,
  });

  const existing = await getExtensionRecord(pairing.extensionHash);
  const deviceId = crypto.randomUUID();
  const deviceToken = randomToken();
  const tokenHash = await sha256(deviceToken);
  const now = new Date().toISOString();

  const record = existing ?? {
    extensionHash: pairing.extensionHash,
    createdAt: now,
    updatedAt: now,
    devices: [],
  };

  record.updatedAt = now;
  record.devices = [
    ...record.devices.filter((device) => device.subscription.endpoint !== subscription.endpoint),
    {
      id: deviceId,
      tokenHash,
      name: requestedName.slice(0, 80) || "Mobile",
      subscription,
      createdAt: now,
      lastSeenAt: now,
      enabled: true,
    },
  ].slice(-10);

  await saveExtensionRecord(record);
  await tokenStore().setJSON(`token:${tokenHash}`, {
    extensionHash: pairing.extensionHash,
    deviceId,
  });

  await store.delete(key);

  return json({
    ok: true,
    deviceId,
    deviceToken,
    deviceName: record.devices.at(-1)?.name ?? "Mobile",
  });
};

export const config: Config = {
  path: "/api/pair/claim",
};
