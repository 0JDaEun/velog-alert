# Velog Alert v2.1 Release Checklist

## Extension

- [x] Manifest V3
- [x] version 2.1.0
- [x] Chrome 120+
- [x] 30초 기본 desktop polling
- [x] 댓글 detector
- [x] 답글 detector
- [x] 좋아요 detector
- [x] 팔로우 detector
- [x] 팔로잉 새 글 detector
- [x] 최초 baseline
- [x] 중복 알림 방지
- [x] Developer 0JDaEun attribution
- [x] GitHub Repository link
- [x] workers.dev host permission
- [x] Relay health check

## Cloudflare Self-host

- [x] self-contained `cloudflare/`
- [x] Worker API router
- [x] RegistryDO
- [x] SQLite PollShardDO
- [x] 30초 Durable Object Alarm
- [x] AES-GCM auth vault
- [x] token rotation 처리
- [x] Web Push
- [x] PC heartbeat
- [x] Cloud settings sync
- [x] `npm run setup`
- [x] PWA Static Assets
- [ ] 실제 Cloudflare Free 계정 deploy
- [ ] `/api/health` smoke test
- [ ] `/api/push/config` smoke test

## Mobile E2E

- [ ] Android PWA 설치
- [ ] iPhone PWA 설치
- [ ] 6자리 pairing
- [ ] 테스트 Push
- [ ] reconnect after Relay URL change

## PC OFF E2E

- [ ] 댓글
- [ ] 답글
- [ ] 좋아요
- [ ] 새 팔로워
- [ ] 팔로잉 새 글
- [ ] duplicate 없음
- [ ] auth rotation
- [ ] auth expired 안내

## Security / Privacy

- [x] Self-host 개인정보 문서
- [x] Self-host Security 문서
- [x] Velog password 미수집
- [x] AES-256-GCM
- [x] token plaintext logging 금지
- [x] Secret Git commit 금지
- [x] Always-on explicit opt-in
- [x] Always-on delete control

## CI

- [x] root JavaScript syntax check
- [x] root unit tests
- [x] Cloudflare TypeScript check workflow
- [ ] latest CI all green

## Release

- [ ] Draft PR #4 review
- [ ] `main` merge
- [ ] Extension ZIP
- [ ] Source ZIP
- [ ] SHA256
- [ ] GitHub Release `v2.1.0`
- [ ] Netlify legacy backend 종료 여부 결정
