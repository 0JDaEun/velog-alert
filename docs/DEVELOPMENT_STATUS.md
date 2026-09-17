# Velog Alert Development Status

기준: 2026-09-17
버전: 1.0.4

## 완료

### Phase 0 — Research
- [x] Notification GraphQL Query 확인
- [x] `comment`, `commentReply`, `postLike`, `follow` 타입 확인
- [x] Action payload 확인
- [x] 게시글 URL 규칙 확인
- [x] Cookie 기반 인증 구조 확인
- [x] Extension Service Worker의 직접 GraphQL 호출 실제 사용자 환경 검증
- [x] Bearer 인증 기반 백그라운드 조회 검증

### Phase 1 — Extension Core
- [x] Manifest V3
- [x] Service Worker
- [x] `chrome.alarms`
- [x] `chrome.storage.local`
- [x] 최초 baseline
- [x] 신규 ID detector
- [x] 동시 검사 lock
- [x] Service Worker 재기동 대응

### Phase 2 — Notification UX
- [x] Chrome Notification
- [x] 클릭 시 URL 이동
- [x] Badge
- [x] 테스트 Notification
- [x] 실제 Velog 활동 자동 Notification 검증

### Phase 3 — Popup / Settings
- [x] 상태 표시
- [x] Velog 인증 상태 표시
- [x] 자동 확인 시간 표시
- [x] 댓글 ON/OFF
- [x] 답글 ON/OFF
- [x] 좋아요 ON/OFF
- [x] 팔로우 ON/OFF
- [x] 1/5/10/30분 주기
- [x] 전체 일시 중지
- [x] 수동 검사
- [x] 최근 감지 History
- [x] History URL 이동
- [x] History 삭제

### Phase 4 — QA
- [x] JS Syntax check
- [x] Manifest validation
- [x] Unit tests 12/12 PASS
- [x] 실제 Chrome Test Notification
- [x] 실제 Velog 신규 알림 조회
- [x] 자동 알림 E2E

## 추가 E2E 권장 항목

1. 답글 → OS 알림 및 URL 이동
2. 좋아요 OFF → OS 알림 없음, History에는 존재
3. 좋아요 ON → 이후 새 좋아요부터 OS 알림
4. Chrome 재시작 → 중복 없음
5. 장시간 사용 후 Alarm 지속 여부 확인

자세한 테스트는 `TEST_PLAN.md` 참고.

## 이후 후보

### V1.1
- 알림 히스토리 검색/필터
- 여러 알림이 한 번에 발생할 때 묶음 알림
- 방해 금지 시간
- Popup에서 Velog 읽음 처리 연동 여부 옵션

### V2
- 이메일 알림
- 선택적 동기화
- 여러 Chrome 프로필/PC 간 상태 동기화

### 배포
- Chrome Web Store 스크린샷/프로모 이미지
- 공개 Privacy Policy URL 등록
- Web Store 심사 제출
