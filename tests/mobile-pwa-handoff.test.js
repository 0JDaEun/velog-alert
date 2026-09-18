import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

async function loadHandoff() {
  const source = await read("../cloudflare/public/handoff.js");
  const context = { URL };
  context.self = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.VelogAlertHandoff;
}

test("mobile handoff only accepts https://velog.io targets", async () => {
  const handoff = await loadHandoff();

  assert.equal(
    handoff.normalizeVelogTarget("https://velog.io/@user/post"),
    "https://velog.io/@user/post",
  );
  assert.equal(handoff.normalizeVelogTarget("http://velog.io/@user/post"), null);
  assert.equal(handoff.normalizeVelogTarget("https://evil.example/"), null);
});

test("mobile handoff builds same-origin PWA URL with target encoded", async () => {
  const handoff = await loadHandoff();
  const result = new URL(
    handoff.buildHandoffUrl(
      "https://velog.io/@user/post",
      "https://velog-alert.example.workers.dev",
    ),
  );

  assert.equal(result.origin, "https://velog-alert.example.workers.dev");
  assert.equal(result.pathname, "/");
  assert.equal(result.searchParams.get("open"), "https://velog.io/@user/post");
  assert.equal(result.searchParams.get("from"), "push");
});

test("pending mobile handoff expires instead of causing stale redirects", async () => {
  const handoff = await loadHandoff();
  const now = 1_000_000;

  assert.equal(
    handoff.isFreshHandoff(
      { url: "https://velog.io/@user/post", createdAt: now - 1_000 },
      now,
    ),
    true,
  );
  assert.equal(
    handoff.isFreshHandoff(
      {
        url: "https://velog.io/@user/post",
        createdAt: now - handoff.MAX_AGE_MS - 1,
      },
      now,
    ),
    false,
  );
});

test("PWA service worker persists target before opening the app", async () => {
  const sw = await read("../cloudflare/public/sw.js");
  const app = await read("../cloudflare/public/app.js");
  const index = await read("../cloudflare/public/index.html");

  assert.match(sw, /storePendingTarget\(target\)/);
  assert.match(sw, /HANDOFF\.buildHandoffUrl\(target, self\.location\.origin\)/);
  assert.match(app, /consumePendingHandoff/);
  assert.match(app, /VELOG_ALERT_OPEN_TARGET/);
  assert.match(index, /handoff\.js\?v=211-click-handoff/);
  assert.doesNotMatch(index, /\\n\s*<link rel="icon"/);
});
