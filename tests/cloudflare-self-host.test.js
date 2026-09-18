import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Cloudflare self-host uses 30-second Durable Object alarms", async () => {
  const shard = await read("../cloudflare/src/shard.ts");
  assert.match(shard, /POLL_INTERVAL_MS\s*=\s*30\s*\*\s*1000/);
  assert.match(shard, /setAlarm\(Date\.now\(\) \+ POLL_INTERVAL_MS\)/);
});

test("Cloudflare self-host skips cloud polling while desktop heartbeat is alive", async () => {
  const shard = await read("../cloudflare/src/shard.ts");
  const worker = await read("../src/background/service-worker.js");
  const client = await read("../src/mobile/push-client.js");

  assert.match(shard, /HEARTBEAT_TTL_MS\s*=\s*90\s*\*\s*1000/);
  assert.match(shard, /heartbeatUntil/);
  assert.match(client, /\/api\/heartbeat/);
  assert.match(worker, /sendCloudHeartbeat/);
});

test("Cloudflare snapshot combines personal notifications and following feed posts", async () => {
  const velog = await read("../cloudflare/src/velog.ts");

  assert.match(velog, /notifications\(input:/);
  assert.match(velog, /feedPosts\(input:/);
  assert.match(velog, /currentUser/);
  assert.match(velog, /refresh_token/);
  assert.match(velog, /getSetCookie/);
});

test("Cloudflare auth is AES-GCM encrypted and never asks for Velog password", async () => {
  const cryptoSource = await read("../cloudflare/src/crypto.ts");
  const setup = await read("../cloudflare/scripts/setup.mjs");
  const selfHost = await read("../docs/CLOUDFLARE_SELF_HOST.md");

  assert.match(cryptoSource, /AES-GCM/);
  assert.match(setup, /randomBytes\(32\)/);
  assert.match(selfHost, /Velog 비밀번호는 사용하지 않습니다/);
  assert.doesNotMatch(setup, /velog.*password|password.*velog/i);
});

test("Extension accepts personal workers.dev relay and attributes developer 0JDaEun", async () => {
  const manifest = await read("../manifest.json");
  const popup = await read("../src/popup/popup.html");
  const options = await read("../src/mobile/options.html");

  assert.match(manifest, /https:\/\/\*\.workers\.dev\/\*/);
  assert.match(popup, /0JDaEun/);
  assert.match(popup, /github\.com\/0JDaEun\/velog-alert/);
  assert.match(options, /Developer · 0JDaEun/);
});

test("Cloudflare project is self-contained for subdirectory deployment", async () => {
  const wrangler = await read("../cloudflare/wrangler.jsonc");
  const index = await read("../cloudflare/public/index.html");
  const app = await read("../cloudflare/public/app.js");

  assert.match(wrangler, /"directory": "\.\/public"/);
  assert.match(index, /Velog Alert/);
  assert.match(app, /\/api\/pair\/claim/);
});

test("setup script deploys generated secrets and removes the temporary file", async () => {
  const setup = await read("../cloudflare/scripts/setup.mjs");

  assert.match(setup, /generateVAPIDKeys/);
  assert.match(setup, /--secrets-file/);
  assert.match(setup, /rmSync\(tempFile/);
});
