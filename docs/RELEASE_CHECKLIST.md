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
- [x] 신규 16/48/128 아이콘 assets 반영
- [x] iOS/PWA 180/192/512 신규 아이콘 및 versioned asset 경로 반영
- [x] Chrome toolbar / extension page 실제 아이콘 렌더 확인

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
- [x] 실제 Cloudflare Free 계정 deploy
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
- [x] PWA icon refresh validation CI green — Run #89 / head `4aef3144b904b24d574fa0a09ba537a936a99058`
- [x] CI Extension artifact 생성 — Artifact `10533811140`, SHA256 `2f23b396f4a882763d39718a95e853d983854734af7f6c1e007e61617261a36d`

## Release

- [x] PR #4 → `main` merge 완료
- [x] `main`에 v2.1 README / Cloudflare / PWA 구조 반영
- [ ] 최종 Release Extension ZIP — 실기기 / PC-OFF E2E 완료 후 확정
- [ ] Source ZIP
- [ ] SHA256
- [ ] GitHub Release `v2.1.0`
- [x] Repository의 Netlify legacy runtime / top-level PWA 중복 제거
- [x] Manifest의 Netlify host permission 제거
- [x] Relay 기본값 제거 — 사용자 Cloudflare URL 필수
- [ ] 기존 Netlify production 삭제 여부 결정 (자동 삭제 금지)
