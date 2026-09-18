import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("cloud auth vault uses AES-GCM and Netlify secret env", async () => {
  const source = await readFile(
    new URL("../netlify/functions/_shared/auth-vault.mts", import.meta.url),
    "utf8"
  );

  assert.match(source, /AES-GCM/);
  assert.match(source, /VELOG_ALERT_AUTH_KEY/);
  assert.doesNotMatch(source, /console\.log/);
});

test("authenticated watcher runs every minute and never stores plaintext token fields in state", async () => {
  const watcher = await readFile(
    new URL("../netlify/functions/notification-watch.mts", import.meta.url),
    "utf8"
  );

  assert.match(watcher, /schedule:\s*"\* \* \* \* \*"/);
  assert.match(watcher, /decryptAuthTokens/);
  assert.match(watcher, /encryptAuthTokens/);
  assert.doesNotMatch(watcher, /console\.log\([^)]*accessToken|console\.log\([^)]*refreshToken/);
});

test("Velog cloud request sends auth cookies and captures refreshed Set-Cookie", async () => {
  const source = await readFile(
    new URL("../netlify/functions/_shared/velog-authenticated.mts", import.meta.url),
    "utf8"
  );

  assert.match(source, /Cookie/);
  assert.match(source, /getSetCookie/);
  assert.match(source, /refresh_token/);
  assert.match(source, /access_token/);
});
