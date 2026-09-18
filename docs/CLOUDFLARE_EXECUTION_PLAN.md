# Velog Alert v2.1 — Cloudflare Self-host 실행 계획

기준일: 2026-09-18

## 최종 목표

개발자 사용자가 공통 Extension ZIP을 설치한 뒤, 자신의 Cloudflare Free 계정에 backend를 직접 배포해 사용하는 구조를 완성한다.

```text
PC ON
→ Chrome Extension
→ 약 30초 감지
→ Web Push

PC OFF
→ 개인 Cloudflare Worker / Durable Object
→ 약 30초 polling
→ Web Push
```

Velog 공식 webhook을 사용하는 구조가 아니므로 문서에서는 **실시간** 대신 **30초 준실시간**으로 표현한다.

## P0 — 구조 고정

상태: 완료

- [x] `feat/cloudflare-free-first-v3` 독립 브랜치
- [x] Draft PR #4
- [x] Workers Static Assets
- [x] RegistryDO
- [x] PollShardDO
- [x] SQLite Durable Objects
- [x] 30초 Durable Object Alarm
- [x] PC heartbeat
- [x] notifications + feedPosts 통합 snapshot
- [x] AES-GCM Velog token 암호화
- [x] Web Push
- [x] `0JDaEun` 개발자 attribution

## P1 — 개발자 Self-host UX

상태: 구현 중

- [x] `cloudflare/` 독립 배포 가능한 디렉터리
- [x] PWA assets를 `cloudflare/public`에 포함
- [x] `npm run setup`
- [x] AUTH_KEY 자동 생성
- [x] VAPID key 자동 생성
- [x] Wrangler 로그인/배포 문서
- [x] Relay URL 사용자 지정
- [x] `*.workers.dev` Extension host permission
- [x] Self-host 설치 문서
- [x] Cloudflare CI/typecheck workflow
- [ ] Deploy to Cloudflare 버튼 실배포 검증
- [ ] Windows / macOS setup script E2E

## P2 — Extension ↔ Cloudflare 안정화

상태: 구현 중

- [x] 30초 Desktop 기본 polling
- [x] Cloud heartbeat endpoint
- [x] 설정 sync endpoint
- [x] Cloud auth enable/status/disable
- [x] desktop/cloud event dedup
- [x] PWA URL을 Relay URL과 동기화
- [ ] Relay URL 변경 시 기존 PWA subscription 재연결 안내
- [ ] 잘못된 Relay URL health check
- [ ] setup 완료 여부 UI 표시

## P3 — 실제 Cloudflare 배포 검증

상태: 대기

필요 조건: Cloudflare 계정 인증.

- [ ] Worker deploy
- [ ] Durable Objects migration 확인
- [ ] Static PWA 접속
- [ ] `/api/push/config`
- [ ] `/api/pair/create`
- [ ] 6자리 pairing
- [ ] Web Push 테스트
- [ ] Always-on 인증
- [ ] access/refresh token rotation
- [ ] PC ON heartbeat
- [ ] PC OFF 30초 alarm

## P4 — PC OFF 5종 E2E

- [ ] 댓글
- [ ] 답글
- [ ] 좋아요
- [ ] 새 팔로워
- [ ] 팔로잉 새 글
- [ ] 중복 Push 없음
- [ ] 인증 만료 안내
- [ ] Always-on 해제 후 encrypted token 삭제

## P5 — 공개 릴리즈

- [ ] README 최종 정리
- [ ] 개인정보/보안 문서 Self-host 기준 정리
- [ ] Extension ZIP 생성
- [ ] Source ZIP 생성
- [ ] SHA256 생성
- [ ] GitHub Release `v2.1.0`
- [ ] Draft PR #4 최종 리뷰
- [ ] `main` 병합
- [ ] 기존 Netlify backend 종료 또는 legacy 표기

## 릴리즈 사용자 흐름

```text
1. Velog Alert Extension ZIP 다운로드
2. 압축 해제 후 Chrome에 Load unpacked
3. GitHub clone
4. cd cloudflare
5. npm install
6. npx wrangler login
7. npm run setup
8. workers.dev URL 복사
9. Extension Relay URL에 입력
10. 휴대폰에서 해당 URL 열기
11. PWA 홈 화면 추가
12. 6자리 pairing
13. Always-on 활성화
14. 완료
```

## 비용 원칙

- Cloudflare Workers Free를 기본으로 한다.
- 자동 유료 전환 기능을 만들지 않는다.
- 중앙 `0JDaEun` Cloudflare 계정을 사용자에게 공유하지 않는다.
- 사용자별 quota와 데이터는 사용자별 Cloudflare 계정에 귀속된다.
- 30초보다 짧은 Cloud polling은 제공하지 않는다.

## 보안 원칙

- Velog 비밀번호 입력 금지
- 사용자가 명시적으로 Always-on을 활성화할 때만 token 전송
- access/refresh token은 HTTPS로 자기 Worker에만 전송
- 서버 저장 시 AES-256-GCM 암호화
- encryption key는 Cloudflare Secret
- token 로그 출력 금지
- Always-on 해제 시 저장 인증정보 삭제
