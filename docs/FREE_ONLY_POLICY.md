# Free-only Development Policy

기준일: 2026-09-18

Velog Alert v2.1의 개발 및 기본 Self-host 운영 원칙은 **사용자 명시적 승인 전 $0**입니다.

## 기본 인프라

- GitHub public repository
- GitHub Actions standard hosted runner
- Cloudflare Workers Free
- SQLite-backed Durable Objects Free
- Workers Static Assets
- 사용자의 로컬 Node.js / Chrome

## Cloudflare 원칙

기본 배포는 Workers Free를 전제로 합니다.

사용 기능:

- Worker
- SQLite-backed Durable Objects
- Durable Object Alarm
- Workers Static Assets

다음은 자동으로 도입하지 않습니다.

- Workers Paid
- 유료 add-on
- 유료 third-party backend
- 중앙 유료 DB
- 중앙 0JDaEun 계정으로 사용자 traffic 집계

Free tier 한도를 넘으면 기능이 실패할 수 있지만 프로젝트 코드가 자동으로 유료 플랜을 활성화하지 않습니다.

## 30초 Always-on

PC가 하루 종일 꺼져 있다고 가정하면 30초 Alarm은 최대 약 2,880 cycles/day입니다.

실제 사용량에는 API 호출, storage read/write, Web Push가 추가되므로 Cloudflare Usage를 함께 확인합니다.

## Legacy backend

v2.1 소스에서는 Netlify runtime, Netlify host permission, Netlify 기본 Relay URL을 제거했습니다.

현재 지원 경로는 **사용자별 Cloudflare Self-host**입니다. 과거 Netlify production 자원은 자동 삭제하지 않으며, 삭제가 필요한 경우 사용자 승인 후 별도 작업으로 처리합니다.

## 코드 가드

`cloudflare/scripts/free-check.mjs`가 다음을 확인합니다.

- SQLite-backed Durable Objects 사용
- 30초 Alarm 기준
- 예상하지 않은 비용성 binding
- PWA Static Assets 구성

CI에서도 이 검사를 실행합니다.

## 변경 원칙

유료 서비스 또는 유료 Cloudflare 기능이 필요한 변경은:

1. 코드에 먼저 추가하지 않는다.
2. 비용과 이유를 설명한다.
3. 사용자가 명시적으로 승인한 뒤 진행한다.

기본값은 항상 **무료 유지**입니다.

## 배포 전 검증

```bash
npm run validate
```

Free-only 검사, TypeScript 검사, Wrangler dry-run을 통과한 뒤 실제 배포합니다.
