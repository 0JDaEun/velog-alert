import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("mobile pairing uses six digit one-time code and ten minute ttl", async () => {
  const source = await readFile(
    new URL("../netlify/functions/pair-create.mts", import.meta.url),
    "utf8"
  );

  assert.match(source, /10 \* 60 \* 1000/);
  assert.match(source, /randomCode/);
  assert.match(source, /store\.get/);
  assert.match(source, /store\.setJSON/);
});

test("pair claim removes pairing code after successful device registration", async () => {
  const source = await readFile(
    new URL("../netlify/functions/pair-claim.mts", import.meta.url),
    "utf8"
  );

  assert.match(source, /await store\.delete\(key\)/);
  assert.match(source, /deviceToken/);
});

test("relay never accepts Velog token fields", async () => {
  const source = await readFile(
    new URL("../netlify/functions/push-send.mts", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /access_token|refresh_token|cookie/i);
});

test("Netlify functions use supported Blobs consistency and auto-provision VAPID", async () => {
  const stores = await readFile(
    new URL("../netlify/functions/_shared/stores.mts", import.meta.url),
    "utf8"
  );
  const push = await readFile(
    new URL("../netlify/functions/push-send.mts", import.meta.url),
    "utf8"
  );
  const delivery = await readFile(
    new URL("../netlify/functions/_shared/push-delivery.mts", import.meta.url),
    "utf8"
  );
  const vapid = await readFile(
    new URL("../netlify/functions/_shared/vapid.mts", import.meta.url),
    "utf8"
  );

  assert.match(stores, /getStore\(name, \{ consistency: "strong" \}\)/);
  assert.doesNotMatch(stores, /get\([^)]*consistency/);
  assert.match(delivery, /getOrCreateVapidKeys/);
  assert.match(vapid, /generateVAPIDKeys/);
  assert.doesNotMatch(push, /process\.env|Netlify\.env/);
  assert.doesNotMatch(push, /onlyIfNew/);
});
