import { getVelogCloudCredentials } from "../api/velog-auth.js";
const STORAGE_KEY = "mobilePush";

export const DEFAULT_RELAY_BASE = "https://velog-alert-mobile.netlify.app";

export function isSelfHostedRelay(relayBase) {
  return Boolean(relayBase && relayBase !== DEFAULT_RELAY_BASE);
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createExtensionSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function getMobileState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const current = result[STORAGE_KEY] ?? {};

  if (!current.extensionSecret) {
    current.extensionSecret = createExtensionSecret();
    current.enabled = Boolean(current.enabled);
    current.relayBase = current.relayBase || DEFAULT_RELAY_BASE;
    await chrome.storage.local.set({ [STORAGE_KEY]: current });
  }

  return {
    enabled: Boolean(current.enabled),
    extensionSecret: current.extensionSecret,
    relayBase: current.relayBase || DEFAULT_RELAY_BASE,
  };
}

export async function saveMobileState(patch) {
  const current = await getMobileState();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function createPairingCode() {
  const state = await getMobileState();

  const response = await fetch(`${state.relayBase}/api/pair/create`, {
    method: "POST",
    headers: {
      "X-Extension-Secret": state.extensionSecret,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `PAIR_CREATE_HTTP_${response.status}`);
  }

  return payload;
}

export async function listMobileDevices() {
  const state = await getMobileState();

  const response = await fetch(`${state.relayBase}/api/devices`, {
    headers: {
      "X-Extension-Secret": state.extensionSecret,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `DEVICE_LIST_HTTP_${response.status}`);
  }

  return payload.devices ?? [];
}

export function normalizePushEvent(item) {
  return {
    eventKey: `${item.type}:${item.id}`,
    type: item.type,
    title: item.displayTitle || "Velog Alert",
    body: item.displayMessage || item.message || "새 Velog 활동이 있습니다.",
    url: item.url || "https://velog.io/notifications",
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

export async function sendMobilePush(item) {
  const state = await getMobileState();
  if (!state.enabled) return { skipped: true, reason: "DISABLED" };

  const response = await fetch(`${state.relayBase}/api/push/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Extension-Secret": state.extensionSecret,
    },
    body: JSON.stringify({
      event: normalizePushEvent(item),
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `PUSH_SEND_HTTP_${response.status}`);
  }

  return payload;
}

export async function sendMobileTestPush() {
  return sendMobilePush({
    id: `mobile-test:${Date.now()}`,
    type: "mobileTest",
    displayTitle: "Velog Alert 모바일 테스트",
    displayMessage: "휴대폰 Web Push 연결이 정상입니다.",
    url: "https://velog.io/notifications",
    createdAt: new Date().toISOString(),
  });
}


export async function syncAlwaysOnFollowings(followings = [], { enabled = true } = {}) {
  const state = await getMobileState();
  const usernames = [...new Set(
    followings
      .map((item) => item?.username)
      .filter(Boolean)
  )];

  const response = await fetch(`${state.relayBase}/api/followings/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Extension-Secret": state.extensionSecret,
    },
    body: JSON.stringify({
      enabled: Boolean(state.enabled && enabled),
      usernames,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `FOLLOWINGS_SYNC_HTTP_${response.status}`);
  }

  return payload;
}

export async function setAlwaysOnFollowWatchEnabled(enabled) {
  const state = await getMobileState();

  const response = await fetch(`${state.relayBase}/api/followings/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Extension-Secret": state.extensionSecret,
    },
    body: JSON.stringify({
      enabled: Boolean(state.enabled && enabled),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `FOLLOW_WATCH_TOGGLE_HTTP_${response.status}`);
  }

  return payload;
}


export async function enableCloudAuth(settings = null) {
  const state = await getMobileState();
  if (!state.enabled) {
    throw new Error("MOBILE_PUSH_DISABLED");
  }

  const credentials = await getVelogCloudCredentials();

  const response = await fetch(`${state.relayBase}/api/cloud-auth/enable`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Extension-Secret": state.extensionSecret,
    },
    body: JSON.stringify({
      ...credentials,
      ...(settings ? {
        settings: {
          comment: Boolean(settings.comment),
          commentReply: Boolean(settings.commentReply),
          postLike: Boolean(settings.postLike),
          follow: Boolean(settings.follow),
          followPost: Boolean(settings.followPost),
        },
      } : {}),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `CLOUD_AUTH_ENABLE_HTTP_${response.status}`);
  }

  return payload;
}

export async function getCloudAuthStatus() {
  const state = await getMobileState();

  const response = await fetch(`${state.relayBase}/api/cloud-auth/status`, {
    headers: {
      "X-Extension-Secret": state.extensionSecret,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `CLOUD_AUTH_STATUS_HTTP_${response.status}`);
  }

  return payload;
}

export async function disableCloudAuth() {
  const state = await getMobileState();

  const response = await fetch(`${state.relayBase}/api/cloud-auth`, {
    method: "DELETE",
    headers: {
      "X-Extension-Secret": state.extensionSecret,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `CLOUD_AUTH_DISABLE_HTTP_${response.status}`);
  }

  return payload;
}


export async function sendCloudHeartbeat() {
  const state = await getMobileState();
  if (!state.enabled || !isSelfHostedRelay(state.relayBase)) {
    return { skipped: true };
  }

  const response = await fetch(`${state.relayBase}/api/heartbeat`, {
    method: "POST",
    headers: {
      "X-Extension-Secret": state.extensionSecret,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `HEARTBEAT_HTTP_${response.status}`);
  }

  return payload;
}

export async function syncCloudSettings(settings = {}) {
  const state = await getMobileState();
  if (!state.enabled || !isSelfHostedRelay(state.relayBase)) {
    return { skipped: true };
  }

  const response = await fetch(`${state.relayBase}/api/settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Extension-Secret": state.extensionSecret,
    },
    body: JSON.stringify({
      settings: {
        comment: Boolean(settings.comment),
        commentReply: Boolean(settings.commentReply),
        postLike: Boolean(settings.postLike),
        follow: Boolean(settings.follow),
        followPost: Boolean(settings.followPost),
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `SETTINGS_SYNC_HTTP_${response.status}`);
  }

  return payload;
}


export async function checkRelayHealth(relayBase = null) {
  const state = await getMobileState();
  const base = (relayBase || state.relayBase || DEFAULT_RELAY_BASE).replace(/\/$/, "");

  const response = await fetch(`${base}/api/health`, {
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload.error || `RELAY_HEALTH_HTTP_${response.status}`);
  }

  return payload;
}
