# Mobile Push Roadmap

기준일: 2026-09-18

Velog Alert의 모바일 경로는 v2.1에서 **Cloudflare Self-host 단일 구조**로 통합되었습니다.

## v2.1.0 — Cloudflare Self-host

```text
PC ON
Velog → Chrome Extension → Chrome Notification
                         → Mobile Web Push

PC OFF
Velog → personal Cloudflare Durable Object
      → Mobile Web Push
```

핵심:

- 사용자별 Cloudflare Free 계정
- 약 30초 Desktop / Cloud polling
- 6자리 10분 one-time pairing
- Android / iPhone PWA
- PC heartbeat로 Cloud 중복 polling 억제
- notifications + feedPosts 통합 snapshot
- Always-on opt-in
- AES-256-GCM encrypted auth storage
- 중앙 backend / 중앙 사용자 DB 없음

## v2.0 — 역사적 프로토타입

초기 모바일 Push 설계에서는 PC Extension → 별도 Relay → PWA 구조와 Netlify/Supabase 계열 후보를 검토했습니다.

해당 runtime은 v2.1 릴리즈 브랜치에서 제거되었으며 현재 설치 경로가 아닙니다. 과거 구현은 Git history에서 확인할 수 있습니다.

## 이후 후보

v2.1 안정화 이후에만 검토합니다.

- onboarding 단순화
- Relay 재연결 UX 개선
- 인증 만료 복구 UX 개선
- 알림 health 진단 고도화
- Chrome Web Store 배포 준비

유료 인프라 도입이나 중앙 backend 전환은 기본 로드맵에 포함하지 않습니다.
