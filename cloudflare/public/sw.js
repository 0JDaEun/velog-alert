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
        url: payload.url || "https://velog.io/notifications",
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "https://velog.io/notifications";

  event.waitUntil(
    clients.openWindow(url),
  );
});
