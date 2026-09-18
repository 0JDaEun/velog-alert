import type { Config } from "@netlify/functions";
import { preflight, json } from "./_shared/http.mts";
import { sha256, validSecret } from "./_shared/crypto.mts";
import { deleteCloudAuth } from "./_shared/auth-vault.mts";

export default async (req: Request) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "DELETE") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const secret = req.headers.get("X-Extension-Secret")?.trim() ?? "";
  if (!validSecret(secret)) return json({ error: "INVALID_EXTENSION_SECRET" }, 401);

  const extensionHash = await sha256(secret);
  await deleteCloudAuth(extensionHash);

  return json({ ok: true });
};

export const config: Config = {
  path: "/api/cloud-auth",
};
