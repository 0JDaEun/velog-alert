import { rateStore } from "./stores.mts";
import { sha256 } from "./crypto.mts";

export async function enforceMinuteRateLimit(
  ip: string,
  bucket: string,
  maxRequests: number,
) {
  const minute = Math.floor(Date.now() / 60_000);
  const ipHash = await sha256(ip || "unknown");
  const key = `${bucket}:${ipHash}:${minute}`;
  const store = rateStore();

  const current = (await store.get(key, {
    type: "json",
    consistency: "strong",
  })) as { count: number } | null;

  const count = (current?.count ?? 0) + 1;
  await store.setJSON(key, { count });

  return count <= maxRequests;
}
