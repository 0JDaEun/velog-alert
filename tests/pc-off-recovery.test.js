import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

function functionBody(source, signature, nextSignature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `missing ${signature}`);
  const end = nextSignature ? source.indexOf(nextSignature, start) : source.length;
  assert.notEqual(end, -1, `missing ${nextSignature}`);
  return source.slice(start, end);
}

test("transient cloud errors keep the Durable Object alarm retryable", async () => {
  const shard = await read("../cloudflare/src/shard.ts");
  const reconcile = functionBody(
    shard,
    "private async reconcileAlarm()",
    "private rememberDedup",
  );

  assert.match(
    reconcile,
    /account\.cloudEnabled\s*&&\s*account\.authStatus\s*!==\s*"expired"/,
  );
  assert.doesNotMatch(
    reconcile,
    /account\.authStatus\s*===\s*"active"/,
  );
});

test("desktop heartbeat self-heals a missing cloud alarm", async () => {
  const shard = await read("../cloudflare/src/shard.ts");
  const heartbeatStart = shard.indexOf(
    'request.method === "POST" && url.pathname === "/heartbeat"',
  );
  assert.notEqual(heartbeatStart, -1);

  const heartbeat = shard.slice(heartbeatStart, shard.indexOf("return Response.json", heartbeatStart));
  assert.match(
    heartbeat,
    /account\.cloudEnabled\s*&&\s*account\.authStatus\s*!==\s*"expired"/,
  );
  assert.match(heartbeat, /await this\.ensureAlarm\(\)/);
});

test("failed push delivery does not consume dedup keys or advance frontiers", async () => {
  const shard = await read("../cloudflare/src/shard.ts");
  const sendIfNew = functionBody(
    shard,
    "private async sendIfNew(",
    "private async pollAccount(",
  );
  const pollAccount = functionBody(
    shard,
    "private async pollAccount(",
    "private async claimDevice(",
  );

  assert.match(sendIfNew, /if \(result\.delivered > 0\)/);
  assert.match(sendIfNew, /this\.rememberDedup\(account, underlyingKeys\)/);

  const failureGuard = pollAccount.indexOf("if (!deliverySucceeded)");
  const frontierUpdate = pollAccount.indexOf("const nextNotificationFrontier");
  assert.ok(failureGuard >= 0, "missing push delivery failure guard");
  assert.ok(frontierUpdate >= 0, "missing frontier update");
  assert.ok(
    failureGuard < frontierUpdate,
    "frontiers must not advance before a failed push returns",
  );
  assert.match(
    pollAccount.slice(failureGuard, frontierUpdate),
    /await this\.saveAccount\(account\);[\s\S]*return;/,
  );
});

test("Velog HTTP auth failures are classified as expired credentials", async () => {
  const velog = await read("../cloudflare/src/velog.ts");

  assert.match(
    velog,
    /response\.status === 401 \|\| response\.status === 403/,
  );
  assert.match(velog, /throw new Error\("VELOG_AUTH_EXPIRED"\)/);
});
