import type { Config } from "@netlify/functions";
import { preflight, json } from "./_shared/http.mts";
import { getOrCreateVapidKeys } from "./_shared/vapid.mts";

export default async (req: Request) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "GET") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const keys = await getOrCreateVapidKeys();
    return json({ vapidPublicKey: keys.publicKey });
  } catch (error) {
    console.error("[push-config] failed to prepare VAPID keys", error);
    return json({ error: "PUSH_CONFIGURATION_FAILED" }, 500);
  }
};

export const config: Config = {
  path: "/api/push/config",
};
