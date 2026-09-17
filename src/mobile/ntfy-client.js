export const MOBILE_PUSH_KEY = 'velogAlertMobilePush';
export const NTFY_ENDPOINT = 'https://ntfy.sh';

function bytesToHex(bytes) {
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function generateNtfyTopic() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `velog-alert-${bytesToHex(bytes)}`;
}

function tagsFor(type) {
  return {
    comment: ['speech_balloon'],
    commentReply: ['left_speech_bubble'],
    postLike: ['heart'],
    follow: ['bust_in_silhouette'],
    followPost: ['memo'],
  }[type] ?? ['bell'];
}

export function normalizeNtfyMessage(item) {
  if (!item?.id || !item?.type) {
    throw new Error('INVALID_NTFY_ITEM');
  }

  return {
    title: item.displayTitle || item.post?.title || 'Velog Alert',
    message:
      item.displayMessage ||
      item.message ||
      `${item.actor?.displayName || item.actor?.username || 'Velog 사용자'}의 새 활동`,
    click: item.url || 'https://velog.io/notifications',
    tags: tagsFor(item.type),
    priority: 3,
  };
}

export async function getMobilePushConfig() {
  const stored = await chrome.storage.local.get(MOBILE_PUSH_KEY);
  return {
    enabled: false,
    topic: null,
    ...(stored[MOBILE_PUSH_KEY] ?? {}),
  };
}

export async function saveMobilePushConfig(patch) {
  const current = await getMobilePushConfig();
  const next = {
    ...current,
    ...patch,
  };

  await chrome.storage.local.set({
    [MOBILE_PUSH_KEY]: next,
  });

  return next;
}

export async function publishNtfy({
  topic,
  item,
  fetchImpl = fetch,
}) {
  if (!topic) {
    throw new Error('NTFY_TOPIC_MISSING');
  }

  const response = await fetchImpl(NTFY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      topic,
      ...normalizeNtfyMessage(item),
    }),
  });

  if (!response.ok) {
    throw new Error(`NTFY_HTTP_${response.status}`);
  }

  return response.json().catch(() => ({ ok: true }));
}

export async function forwardToMobile(item) {
  const config = await getMobilePushConfig();

  if (!config.enabled || !config.topic) {
    return { skipped: true };
  }

  await publishNtfy({
    topic: config.topic,
    item,
  });

  return { skipped: false };
}
