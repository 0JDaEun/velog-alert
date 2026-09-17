import type { Config, Context } from "@netlify/functions";
import { preflight, json } from "./_shared/http.mts";
import { randomCode, sha256, validSecret } from "./_shared/crypto.mts";
import { pairingStore, type PairingRecord } from "./_shared/stores.mts";
import { enforceMinuteRateLimit } from "./_shared/rate-limit.mts";

const TTL_MS = 10 * 60 * 1000;

async function reservePairingCode(extensionHash: string) {
  const store = pairingStore();

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const code = randomCode();
    const key = `pair:${code}`;
    const existing = (await store.get(key, { type: "json" })) as PairingRecord | null;

    if (existing && Date.parse(existing.expiresAt) > Date.now()) {
      continue;
    }

    if (existing) {
      await store.delete(key);
    }

    const now = new Date();
    const record: PairingRecord = {
      extensionHash,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
      attempts: 0,
    };

    await store.setJSON(key, record);

    return {
      code,
      record,
    };
  }

  return null;
}

export default async (req: Request, context: Context) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const allowed = await enforceMinuteRateLimit(context.ip, "pair-create", 10);
  if (!allowed) return json({ error: "RATE_LIMITED" }, 429);

  const secret = req.headers.get("X-Extension-Secret")?.trim() ?? "";
  if (!validSecret(secret)) return json({ error: "INVALID_EXTENSION_SECRET" }, 401);

  const extensionHash = await sha256(secret);
  const reserved = await reservePairingCode(extensionHash);

  if (!reserved) {
    return json({ error: "PAIRING_CODE_EXHAUSTED" }, 503);
  }

  const { code, record } = reserved;

  return json({
    ok: true,
    code,
    expiresAt: record.expiresAt,
    formattedCode: `${code.slice(0, 3)} ${code.slice(3)}`,
  });
};

export const config: Config = {
  path: "/api/pair/create",
};
