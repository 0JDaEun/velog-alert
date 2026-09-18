# Cloudflare Self-host 가이드

Velog Alert의 모바일 Push / PC OFF Always-on 기능은 **각 사용자가 자신의 Cloudflare 계정에 직접 배포하는 Self-host 방식**을 사용합니다.

```text
내 Chrome Extension
        ↓
내 Cloudflare Worker / Durable Objects
        ↓
내 Android / iPhone PWA
```

중앙 서버에 여러 사용자의 Velog 인증정보를 모으는 구조가 아닙니다.

---

## 이 문서에서 다루는 것

- Cloudflare 최초 배포
- Relay URL 확인
- 배포 후 smoke test
- 일반 업데이트
- 로컬 검증
- 제거

처음부터 전체 설치를 진행한다면 먼저 [INSTALLATION.md](INSTALLATION.md)를 권장합니다.

---

# 1. 준비

필요 환경:

- Node.js 20 이상
- npm
- Git
- Cloudflare Free 계정

버전 확인:

```bash
node -v
npm -v
```

Node.js 20 미만이면 setup이 중단됩니다.

---

# 2. 저장소 준비

```bash
git clone https://github.com/0JDaEun/velog-alert.git
cd velog-alert
cd cloudflare
```

> 별도 feature branch checkout은 필요하지 않습니다.  
> 현재 v2.1 설치 기준은 **`main` 브랜치**입니다.

현재 터미널 위치:

```text
velog-alert/cloudflare/
```

파일 구조:

```text
cloudflare/
├─ package.json
├─ wrangler.jsonc
├─ scripts/
│  ├─ setup.mjs
│  └─ free-check.mjs
├─ src/
└─ public/
```

Cloudflare 관련 npm 명령은 이 폴더에서 실행합니다.

---

# 3. 최초 배포

## 3-1. 의존성 설치

```bash
npm install
```

## 3-2. Cloudflare 로그인

```bash
npx wrangler login --device --use-keyring
```

브라우저에서 자신의 Cloudflare 계정으로 로그인합니다.

로그인 확인:

```bash
npx wrangler whoami
```

계정 정보가 출력되면 정상입니다.

## 3-3. setup 실행

```bash
npm run setup
```

setup이 자동으로 수행하는 작업:

```text
Node.js 20+ 확인
→ Cloudflare 로그인 확인
→ Free-only 구조 검사
→ VAPID 연락 이메일 입력
→ AES-256-GCM AUTH_KEY 생성
→ Web Push VAPID key pair 생성
→ 임시 Secret 파일 생성
→ Wrangler dry-run
→ Worker + Durable Objects + PWA 배포
→ 임시 Secret 파일 삭제
```

중간에 다음 입력이 나타납니다.

```text
VAPID 연락 이메일:
```

Web Push VAPID subject로 사용할 본인의 이메일 주소를 입력합니다.

> [!IMPORTANT]
> `npm run setup`은 **최초 설치용**입니다.  
> 일반 코드 업데이트 때 반복 실행하지 않습니다.

---

# 4. Cloudflare Relay URL 확인

배포가 성공하면 Wrangler 마지막 출력에 다음 형태의 주소가 표시됩니다.

```text
https://<worker-name>.<your-subdomain>.workers.dev
```

이 문서에서는 이 주소를 **Cloudflare Relay URL**이라고 부릅니다.

같은 URL이 다음 두 역할을 모두 합니다.

```text
Cloudflare Relay URL
├─ Worker API
└─ Mobile PWA
```

> `https://*.workers.dev`는 예시 패턴입니다.  
> Extension에는 Wrangler가 실제로 출력한 본인의 URL을 입력합니다.

---

# 5. 배포 확인

## 5-1. Health

브라우저:

```text
https://내-Relay-URL/api/health
```

정상 응답 예시:

```json
{
  "ok": true,
  "service": "velog-alert",
  "version": "2.1.0",
  "backend": "cloudflare-self-host",
  "pollIntervalSeconds": 30
}
```

## 5-2. PWA

브라우저에서 Relay URL의 루트를 엽니다.

```text
https://내-Relay-URL/
```

Velog Alert 모바일 연결 화면이 표시되면 Static Assets도 정상입니다.

## 5-3. Extension 연결

Chrome Extension:

```text
Velog Alert
→ 휴대폰 알림 연결
→ Cloudflare Relay 설정
→ Relay URL 입력
→ 저장 및 연결 확인
```

정상 표시:

```text
연결 정상 · cloudflare-self-host · 30초 Cloud polling
```

---

# 6. 동작 구조

## PC ON

```text
Chrome Extension
→ 약 30초 polling
→ Desktop / Mobile 알림
→ Cloudflare heartbeat
```

heartbeat가 유효한 동안 Cloudflare는 해당 계정의 Velog polling을 건너뜁니다.

## PC OFF

```text
Chrome 종료
→ heartbeat 중단
→ 약 90초 후 TTL 만료
→ Durable Object Alarm
→ 약 30초 polling
→ Web Push
```

Cloud polling은 PC가 꺼져 있을 때의 백업 역할입니다.

---

# 7. 주요 구성

## RegistryDO

담당:

- 6자리 Pairing code
- account → Poll Shard 배정

Pairing code는 약 10분 유효하며 1회 사용 후 폐기됩니다.

## PollShardDO

담당:

- PC OFF polling
- Cloud auth 상태
- notification dedup
- Web Push

한 shard는 최대 16계정을 처리하도록 구성합니다.

## PWA

위치:

```text
cloudflare/public/
```

Worker Static Assets로 함께 배포됩니다.

---

# 8. 인증정보와 Secret

Always-on 활성화 시 현재 Velog access / refresh token을 자신의 Cloudflare Worker로 전송합니다.

```text
Velog Token
    ↓
AES-256-GCM
    ↓
Encrypted Data
    ↓
Durable Object
```

암호화 master key와 Web Push VAPID key는 Cloudflare Secret으로 관리합니다.

setup이 자동으로 생성/등록하는 Secret:

```text
AUTH_KEY
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

Velog 비밀번호는 사용하지 않습니다.

---

# 9. 일반 업데이트

> [!WARNING]
> 일반 업데이트에서는 `npm run setup`을 다시 실행하지 않습니다.

실행 순서:

```bash
cd velog-alert
git pull

cd cloudflare
npm install
npm run validate
npm run deploy
```

## validate

```bash
npm run validate
```

내부 실행:

```text
npm run free-check
→ npm run check
→ npm run dry-run
```

실제 배포 없이 Free-only 구조, TypeScript, Wrangler bundle을 검증합니다.

## deploy

```bash
npm run deploy
```

기존 Cloudflare Secret을 유지한 채 현재 코드를 배포합니다.

---

# 10. 로컬 개발 / 검증

현재 위치:

```text
velog-alert/cloudflare/
```

### TypeScript / script 검사

```bash
npm run check
```

### Free-only 검사

```bash
npm run free-check
```

### 실제 배포 없는 Wrangler 검사

```bash
npm run dry-run
```

### 전체 검증

```bash
npm run validate
```

### 로컬 Worker

```bash
npm run dev
```

---

# 11. Free-first 원칙

기본 구성:

```text
Cloudflare Workers Free
SQLite-backed Durable Objects
Workers Static Assets
GitHub Actions public runners
```

프로젝트 코드에는 자동으로 Paid plan으로 전환하는 로직이 없습니다.

다만 Cloudflare Free quota는 무제한이 아니며 실제 계정 Usage는 사용자가 직접 확인해야 합니다.

자세한 원칙: [FREE_ONLY_POLICY.md](FREE_ONLY_POLICY.md)

---

# 12. 제거

## 먼저 Always-on 인증 삭제

Extension:

```text
휴대폰 알림 연결
→ Always-on 해제 및 인증 삭제
```

## 휴대폰 연결 해제

PWA:

```text
이 기기 연결 해제
```

## Worker 삭제

Cloudflare Dashboard에서 본인이 배포한 Velog Alert Worker를 삭제합니다.

전체 제거 권장 순서:

```text
Always-on 인증 삭제
→ 휴대폰 연결 해제
→ Worker 삭제
```

---

## 문제 해결

- Relay 연결 실패
- Wrangler 로그인 문제
- Pairing 실패
- Push 미수신
- Always-on 인증 문제

는 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)를 참고하세요.
