import { CONFIG, DEFAULT_SETTINGS } from '../constants/config.js';

const STATE_KEY = 'velogAlertState';

const DEFAULT_STATE = {
  initialized: false,
  seenNotificationIds: [],
  notificationLinks: {},
  notificationHistory: [],
  unreadBadgeCount: 0,
  lastCheckAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastTransport: null,
  lastAlarmAt: null,
  lastAlarmScheduledAt: null,
  lastTrigger: null,
  alarmConfiguredAt: null,
  lastFetchedCount: 0,
  lastNewCount: 0,
  settings: DEFAULT_SETTINGS,
};

export async function getState() {
  const stored = await chrome.storage.local.get(STATE_KEY);
  const state = stored[STATE_KEY] ?? {};

  return {
    ...DEFAULT_STATE,
    ...state,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(state.settings ?? {}),
    },
  };
}

export async function saveState(patch) {
  const current = await getState();
  const next = {
    ...current,
    ...patch,
    settings: {
      ...current.settings,
      ...(patch.settings ?? {}),
    },
  };

  await chrome.storage.local.set({
    [STATE_KEY]: next,
  });

  return next;
}

export function mergeSeenIds(existing = [], current = []) {
  return [...new Set([...current, ...existing])].slice(0, CONFIG.MAX_SEEN_IDS);
}

export function mergeHistory(existing = [], newNotifications = []) {
  const incoming = newNotifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    createdAt: notification.createdAt,
    detectedAt: new Date().toISOString(),
    title: notification.post?.title || notification.displayTitle,
    actorName:
      notification.actor?.displayName || notification.actor?.username || 'Velog 사용자',
    message: notification.message || notification.displayMessage,
    url: notification.url,
  }));

  const byId = new Map();

  for (const item of [...incoming, ...existing]) {
    if (!item?.id || byId.has(item.id)) continue;
    byId.set(item.id, item);
  }

  return [...byId.values()]
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || a.detectedAt || 0).getTime();
      const bTime = new Date(b.createdAt || b.detectedAt || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, CONFIG.MAX_HISTORY);
}

export async function rememberNotificationLink(notificationId, url) {
  const state = await getState();
  const entries = Object.entries({
    ...(state.notificationLinks ?? {}),
    [notificationId]: url,
  });

  const trimmed = Object.fromEntries(
    entries.slice(Math.max(0, entries.length - CONFIG.MAX_NOTIFICATION_LINKS))
  );

  await saveState({ notificationLinks: trimmed });
}

export async function getNotificationLink(notificationId) {
  const state = await getState();
  return state.notificationLinks?.[notificationId] ?? null;
}
