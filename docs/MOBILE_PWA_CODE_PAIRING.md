# Mobile PWA — 6-digit Code Pairing

기준일: 2026-09-18  
현재 구조: **Cloudflare Self-host v2.1**

## 목표 UX

```text
PC Velog Alert
→ 자신의 Cloudflare Relay URL 저장
→ 6자리 코드 생성

Android / iPhone
→ 같은 workers.dev 주소의 Velog Alert PWA 접속
→ 홈 화면에 추가
→ 6자리 코드 입력
→ 알림 허용
→ 연결 완료
```

회원가입, QR, Supabase, 별도 모바일 앱 설치를 사용하지 않습니다.

## Hosting / Relay

각 사용자가 자신의 Cloudflare Free 계정에 다음을 함께 배포합니다.

```text
cloudflare/
├─ public/          PWA Static Assets
└─ src/
   ├─ index.ts      HTTP API
   ├─ registry.ts   pairing / shard allocation
   └─ shard.ts      device / auth / polling / dedup
```

Pairing 및 account/device 상태는 SQLite-backed Durable Objects에 저장됩니다.

## Pairing

PC Extension은 32-byte `extensionSecret`을 로컬에서 생성합니다. 서버에서는 SHA-256 해시를 account 식별에 사용합니다.

PC:

```text
POST /api/pair/create
X-Extension-Secret: <secret>

→ 482 731
```

Pairing Code:

- 숫자 6자리
- 10분 만료
- 1회 사용
- 성공한 claim 직후 삭제

Phone:

```text
POST /api/pair/claim

{
  "code": "482731",
  "deviceName": "내 iPhone",
  "subscription": { ... }
}
```

성공하면 device token을 발급하고 Web Push subscription을 사용자 계정의 PollShard에 저장합니다.

## Web Push

Cloudflare에 VAPID public/private key와 subject를 설정합니다. Private key는 Extension/PWA에 포함하지 않습니다.

## Always-on

PC OFF에서도 전체 알림을 받으려면 사용자가 Extension에서 **Always-on 전체 알림 활성화**를 명시적으로 선택합니다.

Velog 비밀번호는 요청하지 않습니다. 인증정보는 자기 Cloudflare Worker에만 전달되고 저장 전 AES-256-GCM으로 암호화합니다.

## Android

Chrome에서 PWA를 열고 **앱 설치** 또는 **홈 화면에 추가**를 사용합니다.

## iPhone

Safari → 공유 → 홈 화면에 추가 → 홈 화면의 Velog Alert 실행 → 알림 허용 순서입니다.

## Relay 변경

v2.1에는 중앙 기본 Relay가 없습니다. Extension에서 자신의 `https://...workers.dev` URL을 먼저 저장해야 합니다.

Relay URL을 변경하면 새 Relay 주소에서 PWA를 다시 pairing하는 것을 권장합니다.
