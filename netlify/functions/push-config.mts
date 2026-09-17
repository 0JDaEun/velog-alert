import type { Config } from "@netlify/functions";
import { preflight, json } from "./_shared/http.mts";

export default async (req: Request) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== "GET") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return json({ error: "PUSH_NOT_CONFIGURED" }, 503);

  return json({
    vapidPublicKey: key,
  });
};

export const config: Config = {
  path: "/api/push/config",
};
