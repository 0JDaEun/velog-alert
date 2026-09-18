import type { Config } from "@netlify/functions";
import { preflight, json } from "./_shared/http.mts";
import { sha256, validSecret } from "./_shared/crypto.mts";
import { cloudAuthStore, type CloudAuthRecord } from "./_shared/stores.mts";

export default async (req: Request) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "GET") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const secret = req.headers.get("X-Extension-Secret")?.trim() ?? "";
  if (!validSecret(secret)) return json({ error: "INVALID_EXTENSION_SECRET" }, 401);

  const extensionHash = await sha256(secret);
  const record = (await cloudAuthStore().get(`auth:${extensionHash}`, {
    type: "json",
  })) as CloudAuthRecord | null;

  if (!record) {
    return json({
      enabled: false,
      status: "disabled",
      username: null,
      lastSuccessAt: null,
      lastErrorAt: null,
    });
  }

  return json({
    enabled: record.enabled,
    status: record.status,
    username: record.username,
    lastSuccessAt: record.lastSuccessAt,
    lastErrorAt: record.lastErrorAt,
  });
};

export const config: Config = {
  path: "/api/cloud-auth/status",
};
