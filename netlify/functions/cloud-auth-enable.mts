import type { Config } from "@netlify/functions";
import { preflight, json } from "./_shared/http.mts";
import { sha256, validSecret } from "./_shared/crypto.mts";
import { encryptAuthTokens } from "./_shared/auth-vault.mts";
import {
  cloudAuthStore,
  type CloudAuthRecord,
  type CloudNotificationState,
} from "./_shared/stores.mts";
import { fetchAuthenticatedSnapshot } from "./_shared/velog-authenticated.mts";

function latestFrontier(notifications: Array<{ id: string; created_at?: string | null }>) {
  const valid = notifications
    .filter((item) => item?.id && item?.created_at)
    .sort((a, b) => Date.parse(b.created_at!) - Date.parse(a.created_at!));

  const latestCreatedAt = valid[0]?.created_at ?? null;
  const idsAtLatest = latestCreatedAt
    ? valid.filter((item) => item.created_at === latestCreatedAt).map((item) => item.id)
    : [];

  return { latestCreatedAt, idsAtLatest };
}

export default async (req: Request) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const secret = req.headers.get("X-Extension-Secret")?.trim() ?? "";
  if (!validSecret(secret)) return json({ error: "INVALID_EXTENSION_SECRET" }, 401);

  const body = await req.json().catch(() => null);
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken.trim() : "";

  if (!refreshToken || refreshToken.length < 20) {
    return json({ error: "REFRESH_TOKEN_REQUIRED" }, 400);
  }

  try {
    const snapshot = await fetchAuthenticatedSnapshot({
      accessToken: accessToken || null,
      refreshToken,
    });

    const extensionHash = await sha256(secret);
    const encryptedTokens = await encryptAuthTokens(snapshot.tokens);
    const now = new Date().toISOString();

    const record: CloudAuthRecord = {
      extensionHash,
      encryptedTokens,
      username: snapshot.currentUser.username,
      enabled: true,
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastSuccessAt: now,
      lastErrorAt: null,
    };

    const frontier = latestFrontier(snapshot.notifications);
    const state: CloudNotificationState = {
      initialized: true,
      latestCreatedAt: frontier.latestCreatedAt,
      idsAtLatest: frontier.idsAtLatest,
      updatedAt: now,
    };

    const store = cloudAuthStore();
    await store.setJSON(`auth:${extensionHash}`, record);
    await store.setJSON(`state:${extensionHash}`, state);

    return json({
      ok: true,
      username: record.username,
      status: record.status,
      lastSuccessAt: record.lastSuccessAt,
    });
  } catch (error) {
    const code = (error as Error)?.message || "CLOUD_AUTH_ENABLE_FAILED";
    return json({ error: code }, code === "VELOG_AUTH_EXPIRED" ? 401 : 502);
  }
};

export const config: Config = {
  path: "/api/cloud-auth/enable",
};
