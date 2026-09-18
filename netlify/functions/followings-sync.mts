import type { Config } from "@netlify/functions";
import { preflight, json } from "./_shared/http.mts";
import { sha256, validSecret } from "./_shared/crypto.mts";
import {
  getFollowWatchRecord,
  saveFollowWatchRecord,
} from "./_shared/stores.mts";

function normalizeUsernames(value: unknown) {
  if (!Array.isArray(value)) return null;

  return [...new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.length <= 80),
  )].slice(0, 3000);
}

export default async (req: Request) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const secret = req.headers.get("X-Extension-Secret")?.trim() ?? "";
  if (!validSecret(secret)) return json({ error: "INVALID_EXTENSION_SECRET" }, 401);

  const body = await req.json().catch(() => ({}));
  const extensionHash = await sha256(secret);
  const existing = await getFollowWatchRecord(extensionHash);
  const usernames = body?.usernames === undefined
    ? existing?.followingUsernames ?? []
    : normalizeUsernames(body.usernames);

  if (usernames === null) {
    return json({ error: "INVALID_FOLLOWINGS" }, 400);
  }

  const record = {
    extensionHash,
    enabled: Boolean(body?.enabled),
    followingUsernames: usernames,
    updatedAt: new Date().toISOString(),
  };

  await saveFollowWatchRecord(record);

  return json({
    ok: true,
    enabled: record.enabled,
    followingCount: record.followingUsernames.length,
  });
};

export const config: Config = {
  path: "/api/followings/sync",
};
