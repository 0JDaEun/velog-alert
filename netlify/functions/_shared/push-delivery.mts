import webpush from "web-push";
import {
  dedupStore,
  getExtensionRecord,
  saveExtensionRecord,
} from "./stores.mts";
import { getOrCreateVapidKeys } from "./vapid.mts";

export type MobileEvent = {
  eventKey: string;
  type: string;
  title: string;
  body: string;
  url: string;
  createdAt?: string;
};

export function normalizeMobileEvent(value: unknown): MobileEvent {
  const event = value as Partial<MobileEvent>;

  if (
    !event ||
    typeof event.eventKey !== "string" ||
    typeof event.type !== "string" ||
    typeof event.title !== "string" ||
    typeof event.body !== "string" ||
    typeof event.url !== "string"
  ) {
    throw new Error("INVALID_EVENT");
  }

  if (!event.url.startsWith("https://velog.io/")) {
    throw new Error("INVALID_EVENT_URL");
  }

  return {
    eventKey: event.eventKey.slice(0, 300),
    type: event.type.slice(0, 80),
    title: event.title.slice(0, 160),
    body: event.body.slice(0, 500),
    url: event.url.slice(0, 1200),
    createdAt: event.createdAt,
  };
}

export async function deliverEventToExtension(
  extensionHash: string,
  rawEvent: unknown,
) {
  const event = normalizeMobileEvent(rawEvent);
  const record = await getExtensionRecord(extensionHash);

  if (!record || record.devices.length === 0) {
    return { ok: true, delivered: 0, reason: "NO_DEVICES" };
  }

  const dedupKey = `${extensionHash}:${event.eventKey}`;
  const dedup = dedupStore();
  const existingEvent = await dedup.get(dedupKey);

  if (existingEvent) {
    return { ok: true, delivered: 0, duplicate: true };
  }

  await dedup.set(dedupKey, new Date().toISOString());

  const vapid = await getOrCreateVapidKeys();
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  let delivered = 0;
  let changed = false;

  for (const device of record.devices) {
    if (!device.enabled) continue;

    try {
      await webpush.sendNotification(
        device.subscription,
        JSON.stringify(event),
        { TTL: 300 },
      );
      device.lastSeenAt = new Date().toISOString();
      delivered += 1;
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number })?.statusCode ?? 0);

      if (statusCode === 404 || statusCode === 410) {
        device.enabled = false;
        changed = true;
      } else {
        console.error("[push-delivery] web push delivery failed", statusCode || "unknown");
      }
    }
  }

  if (changed || delivered > 0) {
    record.updatedAt = new Date().toISOString();
    await saveExtensionRecord(record);
  }

  return {
    ok: true,
    delivered,
    duplicate: false,
  };
}
