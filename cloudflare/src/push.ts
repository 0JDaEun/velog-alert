import webpush from "web-push";
import type { DeviceRecord, Env, MobileEvent } from "./types";

export function configureWebPush(env: Env) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
}

export async function sendEventToDevices(
  env: Env,
  devices: DeviceRecord[],
  event: MobileEvent,
) {
  configureWebPush(env);

  let delivered = 0;
  const expiredDeviceIds: string[] = [];

  for (const device of devices.filter((item) => item.enabled)) {
    try {
      await webpush.sendNotification(
        device.subscription,
        JSON.stringify(event),
        { TTL: 300 },
      );
      device.lastSeenAt = new Date().toISOString();
      delivered += 1;
    } catch (error) {
      const statusCode = Number(
        (error as { statusCode?: number })?.statusCode ?? 0,
      );

      if (statusCode === 404 || statusCode === 410) {
        device.enabled = false;
        expiredDeviceIds.push(device.id);
      } else {
        console.error("[push] delivery failed", {
          deviceId: device.id,
          statusCode: statusCode || "unknown",
        });
      }
    }
  }

  return {
    delivered,
    expiredDeviceIds,
  };
}
