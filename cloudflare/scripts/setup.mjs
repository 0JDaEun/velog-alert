import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import webpush from "web-push";

function base64Url(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

const rl = createInterface({ input, output });

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
}

function assertNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);
  if (!Number.isFinite(major) || major < 20) {
    throw new Error(`Node.js 20 이상이 필요합니다. 현재 버전: ${process.versions.node}`);
  }
}

try {
  assertNodeVersion();
  console.log("\nVelog Alert · Cloudflare self-host setup\n");
  console.log("이 스크립트는 AUTH_KEY와 VAPID 키를 로컬에서 생성하고 Cloudflare Secret으로 업로드합니다.");
  console.log("Velog 비밀번호나 Velog 토큰은 이 단계에서 사용하지 않습니다.\n");

  const npx = process.platform === "win32" ? "npx.cmd" : "npx";

  console.log("Cloudflare 로그인 상태를 확인합니다...");
  const whoami = run(npx, ["wrangler", "whoami"], { stdio: "pipe" });

  if (whoami.status !== 0) {
    console.error(whoami.stdout || "");
    console.error(whoami.stderr || "");
    throw new Error(
      "Cloudflare 로그인이 필요합니다. 먼저 'npx wrangler login --use-keyring'을 실행한 뒤 다시 시도하세요."
    );
  }

  console.log("Free-only 구조를 검사합니다...");
  const freeCheck = run(process.execPath, ["scripts/free-check.mjs"], { stdio: "inherit" });
  if (freeCheck.status !== 0) {
    throw new Error("Free-only 검사에 실패해 배포를 중단했습니다.");
  }

  const email = (await rl.question("VAPID 연락 이메일: ")).trim();

  if (!email || !email.includes("@")) {
    throw new Error("유효한 이메일 주소를 입력하세요.");
  }

  const vapid = webpush.generateVAPIDKeys();
  const secrets = {
    AUTH_KEY: base64Url(randomBytes(32)),
    VAPID_PUBLIC_KEY: vapid.publicKey,
    VAPID_PRIVATE_KEY: vapid.privateKey,
    VAPID_SUBJECT: `mailto:${email}`,
  };

  const tempFile = ".velog-alert-secrets.generated.json";
  writeFileSync(tempFile, JSON.stringify(secrets, null, 2), { mode: 0o600 });

  console.log("\n실제 업로드 전에 Wrangler dry-run을 실행합니다...");
  const dryRun = run(
    npx,
    ["wrangler", "deploy", "--dry-run", "--secrets-file", tempFile, "--outdir", ".wrangler/setup-dry-run"],
    { stdio: "inherit" },
  );

  if (dryRun.status !== 0) {
    rmSync(tempFile, { force: true });
    throw new Error("Wrangler dry-run에 실패해 실제 배포를 중단했습니다.");
  }

  console.log("\nCloudflare에 Worker와 Secret을 배포합니다...");
  const result = run(
    npx,
    ["wrangler", "deploy", "--secrets-file", tempFile],
    { stdio: "inherit" },
  );

  rmSync(tempFile, { force: true });

  if (result.status !== 0) {
    throw new Error("Cloudflare 배포에 실패했습니다. 위 Wrangler 오류를 확인하세요.");
  }

  console.log("\n완료.");
  console.log("Wrangler가 출력한 https://*.workers.dev 주소를 복사하세요.");
  console.log("Chrome Extension → 휴대폰 알림 연결 → Relay URL에 붙여넣으면 됩니다.\n");
} finally {
  rl.close();
}
