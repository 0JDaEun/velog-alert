import type { Config } from "@netlify/functions";
import { preflight, json } from "./_shared/http.mts";
import { sha256, validSecret } from "./_shared/crypto.mts";
import {
  deliverEventToExtension,
  normalizeMobileEvent,
} from "./_shared/push-delivery.mts";

export default async (req: Request) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const secret = req.headers.get("X-Extension-Secret")?.trim() ?? "";
  if (!validSecret(secret)) return json({ error: "INVALID_EXTENSION_SECRET" }, 401);

  let event;
  try {
    const body = await req.json();
    event = normalizeMobileEvent(body?.event);
  } catch (error) {
    return json({ error: (error as Error)?.message || "INVALID_EVENT" }, 400);
  }

  const extensionHash = await sha256(secret);
  const result = await deliverEventToExtension(extensionHash, event);
  return json(result);
};

export const config: Config = {
  path: "/api/push/send",
};
