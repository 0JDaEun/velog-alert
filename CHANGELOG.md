# Changelog

## 2.1.0 — in development

### Added

- 사용자별 Cloudflare Workers Free Self-host backend
- SQLite-backed Durable Objects 기반 Registry / PollShard
- 약 30초 PC OFF polling
- PC heartbeat를 통한 Desktop / Cloud 중복 polling 억제
- notifications + feedPosts 통합 snapshot
- 6자리 10분 one-time mobile pairing
- Android / iPhone PWA Web Push
- Always-on explicit opt-in
- AES-256-GCM 인증정보 저장
- Cloudflare setup / free-check / dry-run workflow
- 신규 Velog Alert 16/48/128 Extension icon

### Changed

- 모바일 Relay 기본값을 제거하고 사용자 자신의 `*.workers.dev` URL을 필수로 변경
- Netlify host permission 제거
- Netlify runtime 및 중복 root PWA 제거
- Netlify 전용 테스트를 Cloudflare Self-host 테스트로 마이그레이션

### Validation

- Extension syntax checks / unit tests green
- Cloudflare Free-only check / TypeScript / Wrangler dry-run green
- Cloudflare Free 계정 실제 deploy 성공
- Extension ZIP CI artifact 생성

### Pending

- 최신 소스 live health / pairing / mobile push E2E
- PC OFF 5종 알림 E2E
- 인증 갱신/만료 E2E
- Android/iPhone 최종 실기기 확인
- final merge / release

## 2.0.0 — superseded prototype

v2.0에서는 Netlify 기반 모바일 Relay/PWA 및 Always-on 실험을 진행했습니다. 이 runtime은 v2.1 Cloudflare Self-host 구조로 대체되어 현재 릴리즈 브랜치에서 제거되었습니다.

## 1.1.0 — 2026-09-17

### Added

- 팔로우한 사용자의 새 게시물 Chrome 알림
- Velog `feedPosts` 조회
- 팔로잉 목록 기반 backfill 오탐 방지
- `팔로우 새 글` 알림 토글
- Popup의 팔로잉 피드 / 새 글 카운트
- 새 게시물 History 기록 및 클릭 이동
- feed parser / detector 단위 테스트

### Behavior

- v1.0.4 → v1.1.0 최초 업그레이드 시 현재 Feed를 baseline으로 저장
- 새 사용자를 팔로우하여 기존 글이 Feed에 추가돼도 새 글 알림으로 표시하지 않음
- 팔로잉 피드 조회만 실패하면 댓글/답글 등 기존 알림 처리는 계속 수행

## 1.0.4 — 2026-09-17

### Added

- Chrome Cookies API를 이용한 Velog 인증
- `Authorization: Bearer` 기반 GraphQL 조회
- Popup Velog 인증 상태 표시
- 자동 확인 상태 진단
- `마지막 자동` / `다음 자동` 표시

### Fixed

- Service Worker 직접 GraphQL 호출에서 `HTTP 200 + empty body`가 발생하던 환경 대응
- Manifest V3 Service Worker 재기동 후 자동 확인 안정성 개선
- stale offscreen bridge 복구
- 중복 검사 동시 실행 방지

### Verified

- Chrome 테스트 Notification 정상
- 실제 Velog 신규 활동 Notification 정상
- 자동 알림 경로 정상
- 자동 테스트 12개 통과

## 1.0.3 — 2026-09-17

- `chrome.alarms` 자동 확인 안정화
- Service Worker lifecycle 대응
- offscreen bridge 재연결 로직 추가

## 1.0.2 — 2026-09-17

- Velog 페이지 브리지 fallback 추가
- Service Worker 직접 조회 실패 시 fallback

## 1.0.1 — 2026-09-17

- HTTP 응답 진단 강화
- 빈 응답 / JSON 파싱 오류 구분

## 1.0.0 — 2026-09-17

- 댓글 / 답글 / 좋아요 / 팔로우 감지
- Chrome 알림
- Popup
- 알림 히스토리
- 설정 및 중복 방지
