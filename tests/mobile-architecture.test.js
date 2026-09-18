import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Cloudflare pairing uses a six-digit one-time code with ten-minute TTL", async () => {
  const registry = await read("../cloudflare/src/registry.ts");

  assert.match(registry, /PAIRING_TTL_MS\s*=\s*10\s*\*\s*60\s*\*\s*1000/);
  assert.match(registry, /\^\\d\{6\}\$/);
  assert.match(registry, /await this\.ctx\.storage\.delete\(key\)/);
});

test("Extension requires a user-provided Cloudflare Relay URL", async () => {
  const manifest = await read("../manifest.json");
  const client = await read("../src/mobile/push-client.js");
  const options = await read("../src/mobile/options.html");

  assert.doesNotMatch(manifest, /netlify\.app/i);
  assert.doesNotMatch(client, /velog-alert-mobile\.netlify\.app/i);
  assert.doesNotMatch(options, /velog-alert-mobile\.netlify\.app/i);
  assert.match(client, /RELAY_URL_REQUIRED/);
  assert.match(manifest, /https:\/\/\*\.workers\.dev\/\*/);
});

test("Cloudflare health endpoint identifies the self-host backend", async () => {
  const index = await read("../cloudflare/src/index.ts");

  assert.match(index, /\/api\/health/);
  assert.match(index, /cloudflare-self-host/);
  assert.match(index, /pollIntervalSeconds:\s*30/);
});
