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

try {
  console.log("\nVelog Alert · Cloudflare self-host setup\n");
  console.log("이 스크립트는 AUTH_KEY와 VAPID 키를 로컬에서 생성하고 Cloudflare Secret으로 업로드합니다.");
  console.log("Velog 비밀번호나 Velog 토큰은 이 단계에서 사용하지 않습니다.\n");

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

  console.log("\nCloudflare에 Worker와 Secret을 배포합니다...");
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
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
