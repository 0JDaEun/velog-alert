importScripts("/handoff.js?v=211-click-handoff");

const HANDOFF = self.VelogAlertHandoff;
const HANDOFF_MESSAGE = "VELOG_ALERT_OPEN_TARGET";

function safeTarget(value) {
  return HANDOFF?.normalizeVelogTarget(value) || HANDOFF?.DEFAULT_TARGET || "https://velog.io/notifications";
}

function pendingTargetRequest() {
  return new Request(new URL(HANDOFF.CACHE_KEY_PATH, self.location.origin).href);
}

async function storePendingTarget(url) {
  if (!HANDOFF) return;

  const cache = await caches.open(HANDOFF.CACHE_NAME);
  await cache.put(
    pendingTargetRequest(),
    new Response(
      JSON.stringify({
        url,
        createdAt: Date.now(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    ),
  );
}

async function openNotificationTarget(url) {
  const target = safeTarget(url);

  // Persist first. If iOS ignores clients.openWindow(target) and launches only
  // the PWA start URL, app.js can still consume this one-time handoff.
  await storePendingTarget(target);

  const appClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  const existingClient = appClients.find((client) => {
    try {
      return new URL(client.url).origin === self.location.origin;
    } catch {
      return false;
    }
  });

  if (existingClient) {
    existingClient.postMessage({
      type: HANDOFF_MESSAGE,
      url: target,
    });
    await existingClient.focus();
    return;
  }

  const handoffUrl = HANDOFF.buildHandoffUrl(target, self.location.origin);
  const openedClient = await clients.openWindow(handoffUrl);

  // Some WebKit versions launch the PWA root instead of preserving the URL.
  // The persisted handoff above is the fallback; this message is a best effort.
  openedClient?.postMessage?.({
    type: HANDOFF_MESSAGE,
    url: target,
  });
}

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() || "새 Velog 활동이 있습니다." };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Velog Alert", {
      body: payload.body || "새 Velog 활동이 있습니다.",
      icon: "/icon192-v210.png",
      badge: "/icon192-v210.png",
      tag: payload.eventKey || undefined,
      renotify: false,
      data: {
        url: safeTarget(payload.url),
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(openNotificationTarget(event.notification?.data?.url));
});
