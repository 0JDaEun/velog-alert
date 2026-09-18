# Velog Alert v2.1 — Cloudflare Self-host 실행 계획

기준일: 2026-09-18

## 최종 목표

개발자 사용자가 공통 Extension ZIP을 설치한 뒤, 자신의 Cloudflare Free 계정에 backend를 직접 배포해 사용합니다.

```text
PC ON
→ Chrome Extension
→ 약 30초 감지
→ Chrome Notification / Mobile Web Push

PC OFF
→ 개인 Cloudflare Worker / Durable Object
→ 약 30초 polling
→ Mobile Web Push
```

Velog 공식 webhook 기반이 아니므로 **실시간**이 아니라 **약 30초 polling 기반 준실시간**으로 표현합니다.

## P0 — 구조 고정

상태: 완료

- [x] `feat/cloudflare-free-first-v3` 작업 브랜치
- [x] Draft PR #4
- [x] Workers Static Assets
- [x] RegistryDO / PollShardDO
- [x] SQLite Durable Objects
- [x] 30초 Durable Object Alarm
- [x] PC heartbeat
- [x] notifications + feedPosts 통합 snapshot
- [x] AES-GCM 인증정보 암호화
- [x] Web Push
- [x] Developer · 0JDaEun attribution

## P1 — Self-host UX / 저장소 정리

상태: 코드 완료, 실기기 QA 남음

- [x] `cloudflare/` 독립 배포 디렉터리
- [x] PWA assets를 `cloudflare/public`에 포함
- [x] `npm run setup`
- [x] AUTH_KEY / VAPID key 생성
- [x] Wrangler 로그인/배포 문서
- [x] 사용자 지정 Relay URL
- [x] `*.workers.dev` host permission
- [x] Relay health validation
- [x] Netlify runtime 제거
- [x] 중복 root `pwa/` 제거
- [x] Netlify 기본 Relay URL 제거
- [x] 신규 16/48/128 Extension icon 반영
- [x] 최신 CI green
- [ ] Chrome 실제 아이콘 렌더 QA

## P2 — 실제 Cloudflare 배포

상태: 배포 성공, 최신 소스 smoke/E2E 남음

- [x] 사용자 Cloudflare Free 계정 Worker deploy
- [x] workers.dev URL 발급
- [x] Wrangler OAuth/keyring 로그인
- [ ] 최신 소스 기준 `/api/health` smoke
- [ ] `/api/push/config` smoke
- [ ] 6자리 pairing E2E
- [ ] Mobile test Push
- [ ] Android/iPhone Web Push E2E

## P3 — PC OFF / 인증 E2E

- [ ] 댓글
- [ ] 답글
- [ ] 좋아요
- [ ] 새 팔로워
- [ ] 팔로잉 새 글
- [ ] Desktop ↔ Cloud 전환 중복 없음
- [ ] 인증 갱신/만료 흐름
- [ ] auth expired 안내
- [ ] Always-on 해제 후 저장 인증정보 삭제

## P4 — 공개 릴리즈

- [ ] README 최종 렌더 QA
- [x] 개인정보/보안 문서 Self-host 기준 정리
- [x] Extension CI artifact 생성
- [ ] Source ZIP
- [ ] 최종 SHA256 세트
- [ ] PR base/merge 전략 확정
- [ ] 사용자 승인
- [ ] `main` 병합
- [ ] GitHub Release `v2.1.0`

기존 Netlify production 자원은 자동 삭제하지 않습니다.

## 릴리즈 사용자 흐름

```text
1. Extension ZIP 다운로드 및 압축 해제
2. Chrome Load unpacked
3. GitHub clone
4. cd cloudflare
5. npm install
6. npx wrangler login --device --use-keyring
7. npm run setup
8. workers.dev URL 복사
9. Extension Relay URL 저장
10. 휴대폰에서 해당 URL 열기
11. PWA 홈 화면 추가
12. 6자리 pairing
13. Always-on 활성화
```

## 비용 / 보안 원칙

- Cloudflare Workers Free 기본
- 자동 유료 전환 금지
- 사용자별 quota / 데이터 격리
- Velog 비밀번호 입력 금지
- Always-on 명시적 opt-in
- 서버 저장 시 AES-256-GCM 암호화
- 인증정보 로그 출력 금지
- 30초보다 짧은 Cloud polling 미제공
