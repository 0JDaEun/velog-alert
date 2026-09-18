import { sha256 } from "./crypto";
import { RegistryDO } from "./registry";
import { PollShardDO } from "./shard";
import type { Env } from "./types";

export { RegistryDO, PollShardDO };

function cors(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Extension-Secret, X-Device-Token",
  );
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(value: unknown, status = 200) {
  return cors(Response.json(value, { status }));
}

function registry(env: Env) {
  return env.REGISTRY.getByName("global");
}

async function extensionHash(request: Request) {
  const secret = request.headers.get("X-Extension-Secret")?.trim() ?? "";

  if (secret.length < 32) {
    throw new Error("INVALID_EXTENSION_SECRET");
  }

  return sha256(secret);
}

async function resolveShard(env: Env, hash: string) {
  const response = await registry(env).fetch("https://internal/account/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extensionHash: hash }),
  });

  if (!response.ok) {
    throw new Error("SHARD_RESOLUTION_FAILED");
  }

  return response.json() as Promise<{ shardName: string }>;
}

function shard(env: Env, shardName: string) {
  return env.POLL_SHARDS.getByName(shardName);
}

async function forwardExtensionRequest(
  request: Request,
  env: Env,
  internalPath: string,
) {
  const hash = await extensionHash(request);
  const { shardName } = await resolveShard(env, hash);
  const body = request.method === "GET" ? undefined : await request.text();

  const response = await shard(env, shardName).fetch(
    new Request(`https://internal${internalPath}`, {
      method: request.method,
      headers: {
        "Content-Type": request.headers.get("Content-Type") || "application/json",
        "X-Extension-Hash": hash,
      },
      body,
    }),
  );

  return cors(response);
}

async function handleApi(request: Request, env: Env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return json({ ok: true });
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    return json({
      ok: true,
      service: "velog-alert",
      version: "2.1.0",
      backend: "cloudflare-self-host",
      pollIntervalSeconds: 30,
    });
  }

  if (request.method === "GET" && url.pathname === "/api/push/config") {
    return json({ vapidPublicKey: env.VAPID_PUBLIC_KEY });
  }

  if (request.method === "POST" && url.pathname === "/api/pair/create") {
    let hash: string;

    try {
      hash = await extensionHash(request);
    } catch {
      return json({ error: "INVALID_EXTENSION_SECRET" }, 401);
    }

    const response = await registry(env).fetch("https://internal/pair/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extensionHash: hash }),
    });

    return cors(response);
  }

  if (request.method === "POST" && url.pathname === "/api/pair/claim") {
    const body = await request.json() as {
      code?: string;
      deviceName?: string;
      subscription?: unknown;
    };

    const claim = await registry(env).fetch("https://internal/pair/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: body.code }),
    });

    const pair = await claim.json() as {
      error?: string;
      extensionHash?: string;
      shardName?: string;
    };

    if (!claim.ok || !pair.extensionHash || !pair.shardName) {
      return json(
        { error: pair.error || "PAIRING_CODE_NOT_FOUND" },
        claim.status || 404,
      );
    }

    const response = await shard(env, pair.shardName).fetch(
      "https://internal/device/claim",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extensionHash: pair.extensionHash,
          shardName: pair.shardName,
          deviceName: body.deviceName,
          subscription: body.subscription,
        }),
      },
    );

    return cors(response);
  }

  if (request.method === "DELETE" && url.pathname === "/api/device") {
    const token = request.headers.get("X-Device-Token")?.trim() ?? "";
    const shardName = token.split(".", 1)[0];

    if (!token || !/^shard-\d+$/.test(shardName)) {
      return json({ error: "INVALID_DEVICE_TOKEN" }, 401);
    }

    const response = await shard(env, shardName).fetch(
      "https://internal/device",
      {
        method: "DELETE",
        headers: { "X-Device-Token": token },
      },
    );

    return cors(response);
  }

  if (request.method === "GET" && url.pathname === "/api/devices") {
    try {
      return await forwardExtensionRequest(request, env, "/devices");
    } catch {
      return json({ error: "INVALID_EXTENSION_SECRET" }, 401);
    }
  }

  if (request.method === "POST" && url.pathname === "/api/push/send") {
    try {
      return await forwardExtensionRequest(request, env, "/push/send");
    } catch {
      return json({ error: "INVALID_EXTENSION_SECRET" }, 401);
    }
  }

  if (url.pathname === "/api/cloud-auth/enable" && request.method === "POST") {
    try {
      return await forwardExtensionRequest(request, env, "/cloud-auth/enable");
    } catch {
      return json({ error: "INVALID_EXTENSION_SECRET" }, 401);
    }
  }

  if (url.pathname === "/api/cloud-auth/status" && request.method === "GET") {
    try {
      return await forwardExtensionRequest(request, env, "/cloud-auth/status");
    } catch {
      return json({ error: "INVALID_EXTENSION_SECRET" }, 401);
    }
  }

  if (url.pathname === "/api/cloud-auth" && request.method === "DELETE") {
    try {
      return await forwardExtensionRequest(request, env, "/cloud-auth");
    } catch {
      return json({ error: "INVALID_EXTENSION_SECRET" }, 401);
    }
  }

  if (url.pathname === "/api/settings" && request.method === "POST") {
    try {
      return await forwardExtensionRequest(request, env, "/settings");
    } catch {
      return json({ error: "INVALID_EXTENSION_SECRET" }, 401);
    }
  }

  if (url.pathname === "/api/heartbeat" && request.method === "POST") {
    try {
      return await forwardExtensionRequest(request, env, "/heartbeat");
    } catch {
      return json({ error: "INVALID_EXTENSION_SECRET" }, 401);
    }
  }

  // Legacy Extension compatibility. Cloudflare snapshot already includes feedPosts,
  // so the separate following username sync is no longer needed.
  if (url.pathname === "/api/followings/sync" && request.method === "POST") {
    return json({ ok: true, deprecated: true });
  }

  return json({ error: "NOT_FOUND" }, 404);
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
