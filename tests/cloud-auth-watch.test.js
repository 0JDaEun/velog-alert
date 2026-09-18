import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("cloud auth vault uses AES-GCM with the Cloudflare AUTH_KEY secret", async () => {
  const cryptoSource = await read("../cloudflare/src/crypto.ts");
  const shard = await read("../cloudflare/src/shard.ts");

  assert.match(cryptoSource, /AES-GCM/);
  assert.match(shard, /this\.env\.AUTH_KEY/);
  assert.match(shard, /encryptJson/);
  assert.match(shard, /decryptJson/);
});

test("authenticated polling stores encrypted tokens and never logs plaintext token values", async () => {
  const shard = await read("../cloudflare/src/shard.ts");

  assert.match(shard, /encryptedTokens/);
  assert.match(shard, /encryptJson/);
  assert.doesNotMatch(shard, /console\.(?:log|error)\([^\n]*(?:accessToken|refreshToken)/);
});

test("Velog cloud request sends auth cookies and captures refreshed Set-Cookie", async () => {
  const source = await read("../cloudflare/src/velog.ts");

  assert.match(source, /Cookie/);
  assert.match(source, /getSetCookie/);
  assert.match(source, /refresh_token/);
  assert.match(source, /access_token/);
});
