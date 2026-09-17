# Test Report — v1.1.0

Date: 2026-09-17

## Automated

Command:

```bash
npm test
```

Expected suite count:

```text
21 tests
```

Covered areas:

- Cookie permission
- access_token retrieval implementation
- Bearer Authorization transport
- first-run baseline
- unseen notification detection
- comment parsing
- commentReply parsing
- Service Worker / offscreen recovery
- alarm persistence
- alarm non-reset behavior
- seen ID deduplication
- history deduplication
- following feed parser
- following feed first-run baseline
- existing-following new post detection
- newly-followed user backfill suppression
- following feed ordering
- feed seen-ID deduplication
- followings user-ID normalization
- feedPosts / followings query presence

## Manual

실제 Chrome 환경에서 확인:

- Test Notification 정상
- Velog 로그인 인증 정상
- Velog GraphQL 알림 조회 정상
- 신규 Velog 활동 Chrome Notification 정상
- 자동 확인 정상
- 팔로잉 새 글 actual E2E: 사용자 환경에서 최종 확인 필요

## Known Dependency

Velog Alert는 Velog가 현재 사용하는 내부 GraphQL 및 인증 구조에 의존합니다. Velog 측 변경 시 업데이트가 필요할 수 있습니다.
