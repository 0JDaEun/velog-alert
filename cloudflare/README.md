# Velog Alert — Cloudflare Backend

이 디렉터리는 Velog Alert v2.1의 **모바일 PWA / Web Push / PC OFF Always-on** 기능을 담당합니다.

일반 사용자 설치 순서:

- 전체 설치: [../docs/INSTALLATION.md](../docs/INSTALLATION.md)
- Cloudflare 상세: [../docs/CLOUDFLARE_SELF_HOST.md](../docs/CLOUDFLARE_SELF_HOST.md)
- 문제 해결: [../docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)

---

## 실행 위치

Cloudflare 관련 npm 명령은 저장소 루트가 아니라 이 폴더에서 실행합니다.

```text
velog-alert/cloudflare/
├─ package.json
├─ wrangler.jsonc
├─ scripts/
├─ src/
└─ public/
```

---

## 최초 배포

```bash
git clone https://github.com/0JDaEun/velog-alert.git
cd velog-alert
cd cloudflare

npm install
npx wrangler login --device --use-keyring
npm run setup
```

> `npm run setup`은 최초 설치용입니다.

setup:

```text
Free-only 검사
→ AUTH_KEY / VAPID Key 생성
→ Secret 등록
→ Wrangler dry-run
→ Worker / Durable Objects / PWA 배포
```

배포 완료 후 Wrangler가 출력하는:

```text
https://<worker-name>.<your-subdomain>.workers.dev
```

주소를 Extension의 **Cloudflare Relay URL**로 사용합니다.

---

## 일반 업데이트

```bash
cd velog-alert
git pull

cd cloudflare
npm install
npm run validate
npm run deploy
```

일반 업데이트에서는 `npm run setup`을 다시 실행하지 않습니다.

---

## 개발 명령

| 명령 | 역할 |
|---|---|
| `npm run dev` | Wrangler local dev |
| `npm run check` | setup/free-check script + TypeScript 검사 |
| `npm run free-check` | Free-only 구조 검사 |
| `npm run dry-run` | 실제 배포 없는 Wrangler bundle 검사 |
| `npm run validate` | free-check + check + dry-run |
| `npm run deploy` | 현재 코드 배포 |
| `npm run setup` | 최초 key/Secret 생성 + 배포 |

---

## 구조

```text
Chrome Extension
      │
      ├─ PC ON
      │   ├─ 약 30초 local polling
      │   └─ heartbeat
      │
      └─ Always-on auth
              ↓
Cloudflare Worker
      ↓
RegistryDO
  ├─ 6자리 Pairing
  └─ account → shard
              ↓
PollShardDO
      ↓
PC heartbeat가 만료된 계정만 polling
      ↓
Velog GraphQL
      ↓
Web Push
      ↓
Android / iPhone PWA
```

---

## 주요 구성

### RegistryDO

- 6자리 Pairing code 관리
- account → PollShardDO 배정

### PollShardDO

- PC OFF polling
- Cloud auth 상태
- event dedup
- Push 전송

### Static Assets

위치:

```text
cloudflare/public/
```

모바일 PWA가 Worker와 함께 배포됩니다.

---

## Heartbeat

```text
PC ON
→ Extension heartbeat 유효
→ Cloud Velog polling 생략

PC OFF
→ 약 90초 후 heartbeat 만료
→ Cloud polling 시작
```

Cloud polling 기본 목표 주기는 약 30초입니다.

---

## Secret

setup이 생성/등록하는 Secret:

```text
AUTH_KEY
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

Always-on Velog token은 AES-256-GCM으로 암호화해 저장합니다.

Velog 비밀번호는 사용하지 않습니다.

---

## Self-host 원칙

각 사용자가 **자신의 Cloudflare 계정**에 backend를 배포합니다.

```text
User A → Cloudflare A
User B → Cloudflare B
User C → Cloudflare C
```

개발자 0JDaEun의 중앙 backend에 사용자 Token을 모으지 않습니다.

프로젝트 기본 구조는 Cloudflare Free를 전제로 합니다.  
현재 quota와 실제 Usage는 각 사용자 계정에서 확인해야 합니다.

자세한 내용: [../docs/FREE_ONLY_POLICY.md](../docs/FREE_ONLY_POLICY.md)
