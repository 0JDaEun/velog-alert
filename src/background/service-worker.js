import { CONFIG } from '../constants/config.js';
import { getVelogAuthDiagnostics } from '../api/velog-auth.js';
import {
  fetchAlertSnapshot,
  fetchAlertSnapshotWithTransport,
  fetchFollowings,
  fetchFollowingsWithTransport,
  VelogApiError,
} from '../api/velog-api.js';
import {
  registerVelogBridgePort,
  requestViaVelogPage,
} from './velog-bridge.js';
import { normalizeNotifications } from '../core/notification-parser.js';
import { detectNewNotifications } from '../core/notification-detector.js';
import { normalizeFeedPosts } from '../core/feed-post-parser.js';
import { detectNewFeedPosts } from '../core/feed-post-detector.js';
import {
  showNotifications,
  showTestNotification,
} from '../core/notification-manager.js';
import {
  getState,
  saveState,
  mergeSeenIds,
  mergeSeenFeedPostIds,
  normalizeKnownFollowingUserIds,
  mergeHistory,
  getNotificationLink,
} from '../storage/storage.js';

function normalizeInterval(value) {
  const parsed = Number(value);
  return CONFIG.ALLOWED_INTERVALS.includes(parsed)
    ? parsed
    : CONFIG.DEFAULT_INTERVAL_MINUTES;
}

async function ensureAlarm({ force = false } = {}) {
  const state = await getState();
  const intervalMinutes = normalizeInterval(state.settings.intervalMinutes);
  const existing = await chrome.alarms.get(CONFIG.ALARM_NAME);

  if (!state.settings.enabled) {
    if (existing) {
      await chrome.alarms.clear(CONFIG.ALARM_NAME);
    }
    return null;
  }

  const periodMatches =
    existing &&
    Number(existing.periodInMinutes) === Number(intervalMinutes);

  if (existing && periodMatches && !force) {
    return existing;
  }

  if (existing) {
    await chrome.alarms.clear(CONFIG.ALARM_NAME);
  }

  await chrome.alarms.create(CONFIG.ALARM_NAME, {
    delayInMinutes: intervalMinutes,
    periodInMinutes: intervalMinutes,
  });

  const created = await chrome.alarms.get(CONFIG.ALARM_NAME);

  await saveState({
    alarmConfiguredAt: new Date().toISOString(),
  });

  console.info('[Velog Alert] alarm configured', {
    name: CONFIG.ALARM_NAME,
    periodInMinutes: created?.periodInMinutes,
    scheduledTime: created?.scheduledTime,
  });

  return created;
}

async function updateBadge(count) {
  await chrome.action.setBadgeText({
    text: count > 0 ? String(Math.min(count, 99)) : '',
  });
}

let checkInProgress = null;

async function fetchSnapshotResilient() {
  try {
    const snapshot = await fetchAlertSnapshot();

    return {
      snapshot,
      transport: 'bearer-cookie',
      followings: () => fetchFollowings(snapshot.currentUser.username),
    };
  } catch (directError) {
    console.warn('[Velog Alert] direct GraphQL failed, trying page bridge', {
      code: directError?.code,
      message: directError?.message,
      details: directError?.details,
    });

    try {
      const snapshot = await fetchAlertSnapshotWithTransport(
        requestViaVelogPage
      );

      return {
        snapshot,
        transport: 'velog-page',
        followings: () =>
          fetchFollowingsWithTransport(
            requestViaVelogPage,
            snapshot.currentUser.username
          ),
        directError: {
          code: directError?.code ?? 'UNKNOWN',
          message: directError?.message ?? '',
        },
      };
    } catch (bridgeError) {
      if (bridgeError instanceof VelogApiError) {
        bridgeError.details = {
          ...(bridgeError.details ?? {}),
          directFailure: {
            code: directError?.code ?? 'UNKNOWN',
            message: directError?.message ?? '',
            details: directError?.details ?? null,
          },
        };
      }

      throw bridgeError;
    }
  }
}

function normalizeError(error, fallbackCode = 'UNKNOWN') {
  return error instanceof VelogApiError
    ? {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      }
    : {
        code: fallbackCode,
        message: error?.message ?? '알 수 없는 오류',
        details: null,
      };
}

async function performCheck({
  manual = false,
  trigger = manual ? 'manual' : 'unknown',
} = {}) {
  const startedAt = new Date().toISOString();
  const state = await getState();

  if (!state.settings.enabled && !manual) {
    return { skipped: true, reason: 'DISABLED' };
  }

  await saveState({
    lastCheckAt: startedAt,
    lastTrigger: trigger,
    lastError: null,
  });

  console.info('[Velog Alert] check started', {
    trigger,
    startedAt,
  });

  try {
    const fetchResult = await fetchSnapshotResilient();
    const snapshot = fetchResult.snapshot;

    const normalizedNotifications = normalizeNotifications(
      snapshot.notifications
    );
    const notificationDetection = detectNewNotifications(
      normalizedNotifications,
      state
    );

    const newNotifications = notificationDetection.initializedNow
      ? []
      : notificationDetection.newNotifications;

    let feedDetection = null;
    let feedError = null;
    let normalizedFeedPosts = [];

    try {
      normalizedFeedPosts = normalizeFeedPosts(snapshot.feedPosts);
      const followings = await fetchResult.followings();

      feedDetection = detectNewFeedPosts(
        normalizedFeedPosts,
        state,
        followings
      );
    } catch (error) {
      feedError = normalizeError(error, 'FOLLOW_FEED_ERROR');
      console.error('[Velog Alert] following feed check failed', error);
    }

    const newFeedPosts =
      feedDetection && !feedDetection.initializedNow
        ? feedDetection.newPosts
        : [];

    const allNewItems = [...newNotifications, ...newFeedPosts];

    const [shownNotifications, shownFeedPosts] = await Promise.all([
      showNotifications(newNotifications, state.settings),
      showNotifications(newFeedPosts, state.settings),
    ]);

    const shownCount =
      shownNotifications.length + shownFeedPosts.length;
    const nextBadgeCount =
      (state.unreadBadgeCount ?? 0) + shownCount;

    const nextPatch = {
      initialized: true,
      seenNotificationIds: mergeSeenIds(
        state.seenNotificationIds,
        notificationDetection.allCurrentIds
      ),
      notificationHistory: mergeHistory(
        state.notificationHistory,
        allNewItems
      ),
      unreadBadgeCount: nextBadgeCount,
      lastFetchedCount: normalizedNotifications.length,
      lastNewCount: allNewItems.length,
      lastSuccessAt: new Date().toISOString(),
      lastTransport: fetchResult.transport,
      lastError: null,
    };

    if (feedDetection) {
      Object.assign(nextPatch, {
        feedInitialized: true,
        seenFeedPostIds: mergeSeenFeedPostIds(
          state.seenFeedPostIds,
          feedDetection.allCurrentIds
        ),
        knownFollowingUserIds: normalizeKnownFollowingUserIds(
          feedDetection.currentFollowingUserIds
        ),
        lastFeedFetchedCount: normalizedFeedPosts.length,
        lastFeedNewCount: newFeedPosts.length,
        lastFeedSuccessAt: new Date().toISOString(),
        lastFeedError: null,
      });
    } else if (feedError) {
      Object.assign(nextPatch, {
        lastFeedError: feedError,
      });
    }

    await saveState(nextPatch);
    await updateBadge(nextBadgeCount);

    return {
      initialized: notificationDetection.initializedNow,
      feedInitialized: Boolean(feedDetection?.initializedNow),
      fetchedCount: normalizedNotifications.length,
      feedFetchedCount: normalizedFeedPosts.length,
      newCount: allNewItems.length,
      newFeedPostCount: newFeedPosts.length,
      shownCount,
      feedError,
    };
  } catch (error) {
    const normalizedError = normalizeError(error);

    await saveState({
      lastError: normalizedError,
    });

    console.error('[Velog Alert] check failed', error);
    return { ok: false, error: normalizedError };
  }
}

export function checkVelogNotifications(options = {}) {
  if (checkInProgress) return checkInProgress;

  checkInProgress = performCheck(options).finally(() => {
    checkInProgress = null;
  });

  return checkInProgress;
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureAlarm({ force: true });
  await checkVelogNotifications({ trigger: 'installed' });
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarm();
  await checkVelogNotifications({ trigger: 'startup' });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== CONFIG.ALARM_NAME) return;

  const firedAt = new Date().toISOString();

  await saveState({
    lastAlarmAt: firedAt,
    lastAlarmScheduledAt: Number.isFinite(alarm.scheduledTime)
      ? new Date(alarm.scheduledTime).toISOString()
      : null,
  });

  console.info('[Velog Alert] automatic alarm fired', {
    firedAt,
    scheduledTime: alarm.scheduledTime,
    periodInMinutes: alarm.periodInMinutes,
  });

  await checkVelogNotifications({ trigger: 'alarm' });
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
  const url = await getNotificationLink(notificationId);

  if (url) {
    await chrome.tabs.create({ url });
  }

  await chrome.notifications.clear(notificationId);
});

chrome.runtime.onConnect.addListener((port) => {
  registerVelogBridgePort(port);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'CHECK_NOW') {
    checkVelogNotifications({ manual: true, trigger: 'manual' })
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) =>
        sendResponse({ ok: false, message: error?.message ?? 'unknown error' })
      );

    return true;
  }

  if (message?.type === 'RESET_BADGE') {
    saveState({ unreadBadgeCount: 0 })
      .then(() => updateBadge(0))
      .then(() => sendResponse({ ok: true }));

    return true;
  }

  if (message?.type === 'UPDATE_SETTINGS') {
    const settings = message.settings ?? {};
    const safePatch = {
      enabled: Boolean(settings.enabled),
      comment: Boolean(settings.comment),
      commentReply: Boolean(settings.commentReply),
      postLike: Boolean(settings.postLike),
      follow: Boolean(settings.follow),
      followPost: Boolean(settings.followPost),
      intervalMinutes: normalizeInterval(settings.intervalMinutes),
    };

    saveState({ settings: safePatch })
      .then(() => ensureAlarm({ force: true }))
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({ ok: false, message: error?.message ?? 'unknown error' })
      );

    return true;
  }

  if (message?.type === 'SHOW_TEST_NOTIFICATION') {
    showTestNotification()
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({ ok: false, message: error?.message ?? 'unknown error' })
      );

    return true;
  }

  if (message?.type === 'CLEAR_HISTORY') {
    saveState({ notificationHistory: [] })
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({ ok: false, message: error?.message ?? 'unknown error' })
      );

    return true;
  }

  if (message?.type === 'GET_AUTH_STATUS') {
    getVelogAuthDiagnostics()
      .then((auth) => sendResponse({ ok: true, auth }))
      .catch((error) =>
        sendResponse({
          ok: false,
          message: error?.message ?? 'unknown error',
        })
      );

    return true;
  }

  if (message?.type === 'GET_ALARM_STATUS') {
    chrome.alarms.get(CONFIG.ALARM_NAME)
      .then((alarm) => sendResponse({
        ok: true,
        alarm: alarm
          ? {
              name: alarm.name,
              periodInMinutes: alarm.periodInMinutes,
              scheduledTime: alarm.scheduledTime,
            }
          : null,
      }))
      .catch((error) =>
        sendResponse({ ok: false, message: error?.message ?? 'unknown error' })
      );

    return true;
  }

  return false;
});

ensureAlarm().catch((error) => {
  console.error('[Velog Alert] failed to ensure alarm on worker start', error);
});
