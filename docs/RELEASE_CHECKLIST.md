# Release Checklist

## Code

- [x] Manifest V3
- [x] version = 1.1.0
- [x] JavaScript syntax validation
- [x] Unit tests
- [x] 신규 알림 중복 방지
- [x] 최초 설치 baseline
- [x] 자동 alarm
- [x] Service Worker restart 대응
- [x] Chrome Notification
- [x] Notification 클릭 이동
- [x] 인증 토큰 local storage 미저장
- [x] 팔로잉 새 글 detector
- [x] 새 팔로우 backfill 오탐 방지
- [x] feedPosts / followings GraphQL 연동 테스트

## Manual E2E

- [x] 테스트 Notification 표시
- [x] Velog 인증 상태 확인
- [x] 실제 Velog 알림 조회
- [x] 새 활동 Chrome popup Notification
- [x] 자동 알림 동작 확인
- [ ] 팔로잉 새 글 실제 E2E

## Security / Privacy

- [x] Privacy Policy 초안
- [x] Permission justification 초안
- [x] 인증 토큰 로그 출력 없음
- [x] 별도 Analytics 없음
- [x] 별도 Backend 없음
- [x] HTTPS 통신
- [ ] 공개 Privacy Policy URL 등록
- [ ] 보안 문의 이메일 또는 비공개 채널 등록

## GitHub

- [x] README
- [x] CHANGELOG
- [x] PRIVACY
- [x] SECURITY
- [x] CONTRIBUTING
- [x] Issue template
- [x] 실제 Repository URL 문서에 반영
- [ ] Release tag `v1.1.0`
