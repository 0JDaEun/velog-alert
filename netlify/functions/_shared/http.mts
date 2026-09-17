export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "content-type, x-extension-secret, x-device-token",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Cache-Control": "no-store",
};

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: CORS_HEADERS,
  });
}

export function preflight(req: Request) {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
