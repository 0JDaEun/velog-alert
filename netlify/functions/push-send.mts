import type { Config } from "@netlify/functions";
import webpush from "web-push";
import { preflight, json } from "./_shared/http.mts";
import { sha256, validSecret } from "./_shared/crypto.mts";
import {
  dedupStore,
  getExtensionRecord,
  saveExtensionRecord,
} from "./_shared/stores.mts";
import { getOrCreateVapidKeys } from "./_shared/vapid.mts";

type MobileEvent = {
  eventKey: string;
  type: string;
  title: string;
  body: string;
  url: string;
  createdAt?: string;
};

function normalizeEvent(value: unknown): MobileEvent {
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

export default async (req: Request) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const secret = req.headers.get("X-Extension-Secret")?.trim() ?? "";
  if (!validSecret(secret)) return json({ error: "INVALID_EXTENSION_SECRET" }, 401);

  let event: MobileEvent;
  try {
    const body = await req.json();
    event = normalizeEvent(body?.event);
  } catch (error) {
    return json({ error: error?.message || "INVALID_EVENT" }, 400);
  }

  const extensionHash = await sha256(secret);
  const record = await getExtensionRecord(extensionHash);

  if (!record || record.devices.length === 0) {
    return json({ ok: true, delivered: 0, reason: "NO_DEVICES" });
  }

  const dedupKey = `${extensionHash}:${event.eventKey}`;
  const dedup = dedupStore();
  const existingEvent = await dedup.get(dedupKey);

  if (existingEvent) {
    return json({ ok: true, delivered: 0, duplicate: true });
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
      const statusCode = Number(error?.statusCode ?? 0);

      if (statusCode === 404 || statusCode === 410) {
        device.enabled = false;
        changed = true;
      } else {
        console.error("[push-send] web push delivery failed", statusCode || "unknown");
      }
    }
  }

  if (changed || delivered > 0) {
    record.updatedAt = new Date().toISOString();
    await saveExtensionRecord(record);
  }

  return json({
    ok: true,
    delivered,
    duplicate: false,
  });
};

export const config: Config = {
  path: "/api/push/send",
};
