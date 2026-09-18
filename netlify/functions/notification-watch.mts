import type { Config } from "@netlify/functions";
import {
  cloudAuthStore,
  type CloudAuthRecord,
  type CloudNotificationState,
} from "./_shared/stores.mts";
import { decryptAuthTokens, encryptAuthTokens } from "./_shared/auth-vault.mts";
import {
  fetchAuthenticatedSnapshot,
  type CloudNotification,
} from "./_shared/velog-authenticated.mts";
import { deliverEventToExtension } from "./_shared/push-delivery.mts";

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function actorName(action: Record<string, unknown>) {
  return safeText(action.actor_display_name) || safeText(action.actor_username) || "Velog 사용자";
}

function postUrl(action: Record<string, unknown>) {
  const username = safeText(action.post_writer_username);
  const slug = safeText(action.post_url_slug);
  return username && slug
    ? `https://velog.io/@${username}/${slug}`
    : "https://velog.io/notifications";
}

function toMobileEvent(item: CloudNotification) {
  const action = (item.action ?? {}) as Record<string, unknown>;
  const createdAt = item.created_at || new Date().toISOString();

  switch (item.type) {
    case "comment": {
      const message = safeText(action.comment_text, "새 댓글이 작성되었습니다.");
      return {
        eventKey: `comment:${item.id}`,
        type: "comment",
        title: "Velog 새 댓글",
        body: `${actorName(action)}: ${message}`,
        url: postUrl(action),
        createdAt,
      };
    }
    case "commentReply": {
      const message = safeText(action.reply_comment_text, "새 답글이 작성되었습니다.");
      return {
        eventKey: `commentReply:${item.id}`,
        type: "commentReply",
        title: "Velog 새 답글",
        body: `${actorName(action)}: ${message}`,
        url: postUrl(action),
        createdAt,
      };
    }
    case "postLike":
      return {
        eventKey: `postLike:${item.id}`,
        type: "postLike",
        title: "Velog 새 좋아요",
        body: `${actorName(action)}님이 글에 좋아요를 눌렀습니다.`,
        url: postUrl(action),
        createdAt,
      };
    case "follow": {
      const username = safeText(action.actor_username);
      return {
        eventKey: `follow:${item.id}`,
        type: "follow",
        title: "Velog 새 팔로워",
        body: `${actorName(action)}님이 팔로우했습니다.`,
        url: username ? `https://velog.io/@${username}/posts` : "https://velog.io/notifications",
        createdAt,
      };
    }
    default:
      return null;
  }
}

function detectNew(
  notifications: CloudNotification[],
  state: CloudNotificationState | null,
) {
  if (!state?.initialized || !state.latestCreatedAt) return [];

  const frontier = Date.parse(state.latestCreatedAt);
  const sameTimeIds = new Set(state.idsAtLatest ?? []);

  return notifications
    .filter((item) => {
      if (!item?.id || !item?.created_at) return false;
      const time = Date.parse(item.created_at);
      return time > frontier || (time === frontier && !sameTimeIds.has(item.id));
    })
    .sort((a, b) => Date.parse(a.created_at || "") - Date.parse(b.created_at || ""));
}

function nextState(notifications: CloudNotification[]): CloudNotificationState {
  const valid = notifications
    .filter((item) => item?.id && item?.created_at)
    .sort((a, b) => Date.parse(b.created_at!) - Date.parse(a.created_at!));

  const latestCreatedAt = valid[0]?.created_at ?? null;
  const idsAtLatest = latestCreatedAt
    ? valid.filter((item) => item.created_at === latestCreatedAt).map((item) => item.id)
    : [];

  return {
    initialized: true,
    latestCreatedAt,
    idsAtLatest,
    updatedAt: new Date().toISOString(),
  };
}

export default async () => {
  const store = cloudAuthStore();
  const { blobs } = await store.list({ prefix: "auth:" });

  for (const blob of blobs) {
    const record = (await store.get(blob.key, {
      type: "json",
    })) as CloudAuthRecord | null;

    if (!record?.enabled) continue;

    try {
      const tokens = await decryptAuthTokens(record.encryptedTokens);
      const snapshot = await fetchAuthenticatedSnapshot(tokens);
      const state = (await store.get(`state:${record.extensionHash}`, {
        type: "json",
      })) as CloudNotificationState | null;

      const newNotifications = detectNew(snapshot.notifications, state);

      for (const notification of newNotifications) {
        const event = toMobileEvent(notification);
        if (!event) continue;

        try {
          await deliverEventToExtension(record.extensionHash, event);
        } catch (error) {
          console.error("[notification-watch] push delivery failed", error);
        }
      }

      const tokensChanged =
        snapshot.tokens.accessToken !== tokens.accessToken ||
        snapshot.tokens.refreshToken !== tokens.refreshToken;

      if (tokensChanged) {
        record.encryptedTokens = await encryptAuthTokens(snapshot.tokens);
      }

      record.status = "active";
      record.lastSuccessAt = new Date().toISOString();
      record.lastErrorAt = null;
      record.updatedAt = new Date().toISOString();

      await store.setJSON(`auth:${record.extensionHash}`, record);
      await store.setJSON(`state:${record.extensionHash}`, nextState(snapshot.notifications));
    } catch (error) {
      const code = (error as Error)?.message || "CLOUD_NOTIFICATION_WATCH_FAILED";
      console.error("[notification-watch] check failed", {
        extensionHash: record.extensionHash.slice(0, 10),
        code,
      });

      record.lastErrorAt = new Date().toISOString();

      if (code === "VELOG_AUTH_EXPIRED") {
        record.status = "expired";
        record.enabled = false;

        try {
          await deliverEventToExtension(record.extensionHash, {
            eventKey: `cloudAuthExpired:${record.updatedAt}`,
            type: "cloudAuth",
            title: "Velog Alert 인증 갱신 필요",
            body: "PC가 꺼져 있을 때의 알림 인증이 만료되었습니다. PC에서 Velog Alert를 열어 다시 연결해 주세요.",
            url: "https://velog.io/",
            createdAt: new Date().toISOString(),
          });
        } catch {}
      } else {
        record.status = "error";
      }

      record.updatedAt = new Date().toISOString();
      await store.setJSON(`auth:${record.extensionHash}`, record);
    }
  }
};

export const config: Config = {
  schedule: "* * * * *",
};
