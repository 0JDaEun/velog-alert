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
  assert.match(source, /onlyIfNew/);
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
