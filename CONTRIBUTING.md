# Contributing

## 개발 환경

```bash
npm test
npm run check
```

PR 전 다음 항목을 확인해주세요.

- 기존 테스트 전체 통과
- 신규 로직에 대한 테스트 추가
- `manifest.json` 권한 추가 시 사용 이유 문서화
- 인증정보 원문을 로그에 남기지 않음
- Velog API 변경 시 `docs/ARCHITECTURE.md`와 `docs/TROUBLESHOOTING.md` 갱신
- 개인정보 처리 방식이 바뀌면 `PRIVACY.md` 갱신

## Commit 예시

```text
feat: add notification filter
fix: recover alarm after worker restart
docs: update Chrome Web Store privacy disclosure
test: cover notification deduplication
```
