import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("always-on follow posts are polled by the Cloudflare Durable Object every 30 seconds", async () => {
  const shard = await read("../cloudflare/src/shard.ts");

  assert.match(shard, /POLL_INTERVAL_MS\s*=\s*30\s*\*\s*1000/);
  assert.match(shard, /newFeedPosts\.map\(feedPostToEvent\)/);
  assert.match(shard, /setAlarm\(Date\.now\(\) \+ POLL_INTERVAL_MS\)/);
});

test("Cloudflare and desktop use the same follow-post event key family", async () => {
  const velog = await read("../cloudflare/src/velog.ts");
  const client = await read("../src/mobile/push-client.js");

  assert.match(velog, /followPost:feed-post:/);
  assert.match(client, /eventKey:/);
  assert.match(client, /item\.type/);
  assert.match(client, /item\.id/);
});

test("legacy followings sync endpoint is a no-op compatibility route", async () => {
  const index = await read("../cloudflare/src/index.ts");

  assert.match(index, /\/api\/followings\/sync/);
  assert.match(index, /deprecated:\s*true/);
});
