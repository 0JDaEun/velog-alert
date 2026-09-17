import type { Config, Context } from "@netlify/functions";
import { preflight, json } from "./_shared/http.mts";
import { randomCode, sha256, validSecret } from "./_shared/crypto.mts";
import { pairingStore } from "./_shared/stores.mts";
import { enforceMinuteRateLimit } from "./_shared/rate-limit.mts";

const TTL_MS = 10 * 60 * 1000;

export default async (req: Request, context: Context) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const allowed = await enforceMinuteRateLimit(context.ip, "pair-create", 10);
  if (!allowed) return json({ error: "RATE_LIMITED" }, 429);

  const secret = req.headers.get("X-Extension-Secret")?.trim() ?? "";
  if (!validSecret(secret)) return json({ error: "INVALID_EXTENSION_SECRET" }, 401);

  const extensionHash = await sha256(secret);
  const store = pairingStore();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = randomCode();
    const result = await store.setJSON(
      `pair:${code}`,
      {
        extensionHash,
        expiresAt,
        createdAt: new Date().toISOString(),
        attempts: 0,
      },
      { onlyIfNew: true },
    );

    if (result.modified) {
      return json({
        ok: true,
        code,
        expiresAt,
        formattedCode: `${code.slice(0, 3)} ${code.slice(3)}`,
      });
    }
  }

  return json({ error: "PAIRING_CODE_EXHAUSTED" }, 503);
};

export const config: Config = {
  path: "/api/pair/create",
};
