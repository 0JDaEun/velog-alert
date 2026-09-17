# Changelog

## 2.0.0 — 2026-09-17

### Added

- ntfy 기반 휴대폰 알림
- 별도 Supabase / 백엔드 없이 동작
- 24-byte random secret Topic 자동 생성
- Topic 복사 / 재생성 / 테스트 알림
- 휴대폰 알림 클릭 시 관련 Velog URL 이동

### Privacy

- 휴대폰 알림이 켜진 경우 알림 제목, 본문, 관련 URL이 `ntfy.sh`로 전송될 수 있음
- Velog access token / refresh token / cookies는 ntfy로 전송하지 않음

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
