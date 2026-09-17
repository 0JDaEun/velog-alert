import type { Config } from "@netlify/functions";
import { preflight, json } from "./_shared/http.mts";
import { sha256, validSecret } from "./_shared/crypto.mts";
import { getExtensionRecord } from "./_shared/stores.mts";

export default async (req: Request) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "GET") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const secret = req.headers.get("X-Extension-Secret")?.trim() ?? "";
  if (!validSecret(secret)) return json({ error: "INVALID_EXTENSION_SECRET" }, 401);

  const extensionHash = await sha256(secret);
  const record = await getExtensionRecord(extensionHash);

  return json({
    devices: (record?.devices ?? []).map((device) => ({
      id: device.id,
      name: device.name,
      enabled: device.enabled,
      createdAt: device.createdAt,
      lastSeenAt: device.lastSeenAt,
    })),
  });
};

export const config: Config = {
  path: "/api/devices",
};
