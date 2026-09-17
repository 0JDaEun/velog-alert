import { forwardToMobile } from '../mobile/ntfy-client.js';
import { rememberNotificationLink } from '../storage/storage.js';

export function shouldNotify(notification, settings) {
  return settings.enabled && Boolean(settings[notification.type]);
}

export async function showNotifications(notifications, settings) {
  const shown = [];

  for (const notification of notifications) {
    if (!shouldNotify(notification, settings)) continue;

    const chromeNotificationId = `velog-alert:${notification.id}`;

    await chrome.notifications.create(chromeNotificationId, {
      type: 'basic',
      title: notification.displayTitle,
      message: notification.displayMessage.slice(0, 240),
      iconUrl: chrome.runtime.getURL('assets/icon128.png'),
      priority: 1,
    });

    await rememberNotificationLink(chromeNotificationId, notification.url);

    try {
      await forwardToMobile(notification);
    } catch (error) {
      console.warn('[Velog Alert] mobile push failed', {
        message: error?.message ?? 'unknown error',
      });
    }

    shown.push(notification);
  }

  return shown;
}

export async function showTestNotification() {
  const id = `velog-alert:test:${Date.now()}`;
  const url = 'https://velog.io/notifications';

  await chrome.notifications.create(id, {
    type: 'basic',
    title: 'Velog Alert 테스트',
    message: 'Chrome 알림이 정상적으로 표시되고 있습니다.',
    iconUrl: chrome.runtime.getURL('assets/icon128.png'),
    priority: 1,
  });

  await rememberNotificationLink(id, url);
  return id;
}
