# Mobile PWA — 6-digit Code Pairing

## 목표 UX

```text
PC Velog Alert
→ 휴대폰 연결
→ 6자리 코드 표시

Android / iPhone
→ Velog Alert PWA 접속
→ 홈 화면에 추가
→ 6자리 코드 입력
→ 알림 허용
→ 연결 완료
```

회원가입, QR, Supabase, 별도 모바일 앱 설치를 사용하지 않는다.

## Hosting / Relay

한 개의 Netlify 프로젝트에 다음을 함께 배포한다.

```text
pwa/                  정적 PWA
netlify/functions/    Tiny Push Relay
Netlify Blobs         Pairing / Device / Dedup KV
```

Netlify Blobs는 별도 DB 생성이나 migration 없이 Function에서 바로 사용하는 key/value storage다.

## Pairing

PC Extension은 32-byte `extensionSecret`을 로컬에서 생성한다.

서버에는 원문을 저장하지 않으며 SHA-256 값만 device group key로 사용한다.

PC:

```text
POST /api/pair/create
X-Extension-Secret: <secret>

→ 482731
```

Pairing Code:

- 숫자 6자리
- 10분 만료
- 1회 사용
- session attempt 최대 5회
- IP 단위 분당 제한

Phone:

```text
POST /api/pair/claim

{
  "code": "482731",
  "deviceName": "내 iPhone",
  "subscription": { ... }
}
```

성공하면 code를 즉시 삭제하고 device token을 발급한다.

## Web Push

서버 환경변수:

```text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

Private Key는 Extension/PWA에 포함하지 않는다.

## 저장하지 않는 정보

- Velog password
- Velog access token
- Velog refresh token
- Velog cookies
- 전체 Velog notification history

Relay에는 push routing에 필요한 subscription과 최소 device metadata만 저장한다.

## Android

Chrome의 PWA install prompt를 사용한다.

## iPhone

Safari → 공유 → 홈 화면에 추가 → 홈 화면의 Velog Alert 실행 → 알림 허용.

Web Push 등록은 standalone 상태에서 진행한다.

## v2.0 제한

v2.0의 Velog 감지는 PC Chrome Extension이 담당한다.

PC가 완전히 종료된 상태에서도 새 글을 감지하는 Always-on 기능은 별도 단계로 남긴다.
