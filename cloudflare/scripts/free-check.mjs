import { readFile } from "node:fs/promises";

const wranglerPath = new URL("../wrangler.jsonc", import.meta.url);
const shardPath = new URL("../src/shard.ts", import.meta.url);

const wrangler = JSON.parse(await readFile(wranglerPath, "utf8"));
const shard = await readFile(shardPath, "utf8");

const errors = [];

const migration = Array.isArray(wrangler.migrations)
  ? wrangler.migrations.at(-1)
  : null;

if (!migration?.new_sqlite_classes?.includes("RegistryDO")) {
  errors.push("RegistryDO must use SQLite-backed Durable Objects for Workers Free.");
}

if (!migration?.new_sqlite_classes?.includes("PollShardDO")) {
  errors.push("PollShardDO must use SQLite-backed Durable Objects for Workers Free.");
}

if (migration?.new_classes?.length) {
  errors.push("Legacy/KV-backed Durable Object migration is not allowed in Free-only mode.");
}

const paidOrUnusedBindings = [
  "queues",
  "vectorize",
  "workflows",
  "browser",
  "ai",
];

for (const key of paidOrUnusedBindings) {
  if (wrangler[key]) {
    errors.push(`Unexpected binding "${key}" found. Review its billing before release.`);
  }
}

const intervalMatch = shard.match(
  /POLL_INTERVAL_MS\s*=\s*(\d+)\s*\*\s*1000/
);

if (!intervalMatch) {
  errors.push("Could not determine POLL_INTERVAL_MS.");
} else {
  const seconds = Number(intervalMatch[1]);
  const alarmsPerDay = Math.ceil(86400 / seconds);

  if (alarmsPerDay >= 100000) {
    errors.push(
      `Alarm plan would use ${alarmsPerDay} requests/day, which is not safely below the Workers Free Durable Object request limit.`
    );
  }

  console.log(
    `Cloud polling: ${seconds}s → up to ${alarmsPerDay.toLocaleString()} alarm invocations/day per always-on self-host account.`
  );
}

if (wrangler.assets?.directory !== "./public") {
  errors.push("PWA assets should remain on Workers Static Assets.");
}

if (errors.length) {
  console.error("\nFREE-ONLY CHECK FAILED\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("FREE-ONLY CHECK PASS");
console.log("Only free-compatible primitives currently required by Velog Alert were detected.");
