import type { Config } from "@netlify/functions";
import { preflight, json } from "./_shared/http.mts";
import { sha256, validSecret } from "./_shared/crypto.mts";
import {
  tokenStore,
  getExtensionRecord,
  saveExtensionRecord,
} from "./_shared/stores.mts";

export default async (req: Request) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "DELETE") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const token = req.headers.get("X-Device-Token")?.trim() ?? "";
  if (!validSecret(token)) return json({ error: "INVALID_DEVICE_TOKEN" }, 401);

  const tokenHash = await sha256(token);
  const mapping = (await tokenStore().get(`token:${tokenHash}`, {
    type: "json",
  })) as { extensionHash: string; deviceId: string } | null;

  if (!mapping) return json({ error: "DEVICE_NOT_FOUND" }, 404);

  const record = await getExtensionRecord(mapping.extensionHash);
  if (record) {
    record.devices = record.devices.filter((device) => device.id !== mapping.deviceId);
    record.updatedAt = new Date().toISOString();
    await saveExtensionRecord(record);
  }

  await tokenStore().delete(`token:${tokenHash}`);

  return json({ ok: true });
};

export const config: Config = {
  path: "/api/device",
};
