export function detectNewNotifications(notifications, state) {
  const seen = new Set(state.seenNotificationIds ?? []);

  if (!state.initialized) {
    return {
      initializedNow: true,
      newNotifications: [],
      allCurrentIds: notifications.map((item) => item.id),
    };
  }

  const newNotifications = notifications
    .filter((item) => !seen.has(item.id))
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });

  return {
    initializedNow: false,
    newNotifications,
    allCurrentIds: notifications.map((item) => item.id),
  };
}
