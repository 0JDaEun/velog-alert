# Velog Alert — Cloudflare Free-first Backend

## 공식 설치 방식 — Wrangler CLI

v2.1의 공식 설치 경로는 Cloudflare 플러그인이나 ChatGPT Desktop이 아니라 **Wrangler CLI**입니다.

```bash
git clone https://github.com/0JDaEun/velog-alert.git
cd velog-alert
git checkout feat/cloudflare-free-first-v3
cd cloudflare
npm install
npx wrangler login --device --use-keyring
npm run setup
```

Cloudflare Plugin/MCP는 프로젝트 설치에 필요하지 않습니다.

## 권장 배포 모델 — 사용자별 Self-host

공개 배포에서는 중앙 Cloudflare 계정을 공유하지 않고, **각 개발자가 자신의 Cloudflare Free 계정에 이 Worker를 배포**하는 방식을 권장합니다.

이 방식이면 사용자 수가 늘어나도 개발자 0JDaEun의 Cloudflare quota나 비용이 증가하지 않습니다. 각 사용자의 Velog 인증정보도 각자의 Cloudflare 계정에만 저장됩니다.

설치 가이드: [../docs/CLOUDFLARE_SELF_HOST.md](../docs/CLOUDFLARE_SELF_HOST.md)

> Cloud polling은 30초 간격의 준실시간 방식입니다. Velog 공식 webhook이 아니므로 엄밀한 실시간 Push는 아닙니다.


이 디렉터리는 Netlify Relay를 대체하기 위한 **다중 사용자용 무료 우선 백엔드**입니다.

## 목표

- Chrome이 켜져 있으면 기존 Extension이 30초 단위로 빠르게 감지
- Chrome이 꺼지면 Cloudflare가 약 30초마다 백업 감지
- 댓글 / 답글 / 좋아요 / 새 팔로워 / 팔로잉 새 글 지원
- Velog 비밀번호 저장 금지
- access / refresh token은 AES-GCM 암호화 저장
- PWA 정적 파일은 Workers Static Assets로 제공
- 별도 유료 DB 없음
- Free 한도 초과 전까지 비용 0원

## 구조

```text
Chrome Extension
      │
      ├── PC ON: 30초 로컬 감지
      │            │
      │            └── heartbeat
      │
      └── Always-on 인증
                   ↓
Cloudflare Worker
       ↓
RegistryDO
  ├── 6자리 Pairing
  └── account → Poll Shard 배정
                   ↓
PollShardDO (최대 16계정)
       ↓ 30초 Alarm
PC heartbeat가 만료된 계정만
Velog GraphQL snapshot 1회
       ├── notifications
       └── feedPosts
                   ↓
Web Push
                   ↓
Android / iPhone PWA
```

## 왜 Shard인가

사용자마다 Durable Object Alarm 하나를 만들면 무료 요청/Duration을 빨리 사용합니다.

Velog Alert는 여러 계정을 한 Poll Shard에 모아 **한 번의 Alarm으로 최대 16계정**을 처리합니다.

16계정으로 제한한 이유는 Workers Free의 외부 subrequest 한도에 여유를 남기기 위해서입니다.

- Velog 조회: 최대 16 subrequests
- 한 polling cycle의 알림은 사용자별 1개 Push로 요약
- 사용자당 활성 Push 기기: 최대 2개
- 최악의 일반 cycle: 16 + 32 = 48 subrequests

Cloudflare Free의 50 subrequests/invocation 한도 안에 들어오도록 구성합니다.

## Heartbeat

PC Extension은 기본 30초 desktop check 시 Cloudflare heartbeat를 함께 보냅니다.

서버는 heartbeat 수신 후 약 90초 동안 해당 PC를 활성 상태로 봅니다.

```text
PC ON
→ heartbeat 유효
→ PollShard Alarm은 실행되더라도 Velog 요청 생략

PC OFF
→ 약 90초 후 heartbeat 만료
→ Cloud polling 시작
```

즉 Cloud polling은 **PC가 꺼져 있을 때의 백업 역할**만 합니다.

## Cloud polling

기본 간격:

```text
30초
```

Cloud 조회 한 번에 Velog GraphQL request 하나로 다음을 함께 가져옵니다.

- notifications
- currentUser
- feedPosts

따라서 댓글과 팔로잉 새 글을 따로 polling하지 않습니다.

## 환경변수 / Secret

Production 배포 전에 다음 값을 설정해야 합니다.

```bash
npx wrangler secret put AUTH_KEY
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_SUBJECT
```

### AUTH_KEY

32 random bytes를 base64url로 변환한 값입니다.

Velog access / refresh token 암호화에만 사용합니다.

### VAPID

```bash
npx web-push generate-vapid-keys
```

로 한 번 생성합니다.

Cloudflare 공식 Web Push 예제와 동일하게 `web-push` 패키지를 사용합니다.

## 로컬 실행

```bash
cd cloudflare
npm install
npm run types
npm run check
npm run dev
```

## 배포

Cloudflare 계정 연결 후:

```bash
cd cloudflare
npm install
npm run deploy
```

배포된 `https://...workers.dev` URL을 Extension Relay URL로 설정하여 E2E 검증합니다.

기존 Netlify Production은 Cloudflare E2E가 끝날 때까지 제거하지 않습니다.

## 마이그레이션 순서

1. Cloudflare Worker / Durable Objects deploy
2. VAPID / AUTH secrets 설정
3. `/api/push/config` smoke test
4. Extension Relay URL을 Cloudflare preview URL로 변경
5. 6자리 Pairing E2E
6. Always-on 인증 E2E
7. heartbeat 연결
8. PC OFF 상태 5종 알림 E2E
9. Cloudflare를 기본 Relay로 변경
10. Netlify Scheduled Functions 중지
11. Netlify는 rollback 기간 후 제거

## 비용 보호 원칙

- Workers Free로 시작
- 유료 전환은 사용자가 직접 결정하기 전까지 하지 않음
- PC 활성 계정은 Velog Cloud polling 생략
- Production deploy는 최종 검증 시에만 수행
- 30초보다 짧은 Cloud polling은 기본 제공하지 않음
