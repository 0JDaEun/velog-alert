# Free-only Development Policy

기준일: 2026-09-18

Velog Alert v2.1의 개발 및 기본 Self-host 운영 원칙은 **사용자 명시적 승인 전 $0**입니다.

## 개발 단계

프로젝트 개발 과정에서 사용하는 기본 인프라는 다음과 같습니다.

- GitHub public repository
- GitHub Actions standard `ubuntu-latest`
- Cloudflare Workers Free
- SQLite-backed Durable Objects Free
- Workers Static Assets
- 사용자의 로컬 Node.js / Chrome

GitHub 공식 정책상 public repository의 standard GitHub-hosted runner는 무료입니다.

## Cloudflare

기본 배포는 Workers Free를 전제로 합니다.

사용 기능:

- Worker
- SQLite-backed Durable Objects
- Durable Object Alarm
- Workers Static Assets

사용하지 않는 것을 기본 원칙으로 합니다.

- Workers Paid 자동 전환
- 유료 add-on 자동 활성화
- 비용이 필요한 third-party backend
- 중앙 유료 DB
- 중앙 0JDaEun 계정으로 사용자 traffic 집계

Free tier 한도를 넘으면 기능이 실패할 수 있지만 **프로젝트 코드가 자동으로 Paid plan을 활성화하지 않습니다.**

## 30초 Always-on

PC가 하루 종일 꺼져 있다고 가정하면 30초 Alarm은:

```text
86,400 / 30
= 2,880 alarm invocations/day
```

입니다.

Cloudflare Durable Objects Free의 100,000 requests/day보다 충분히 작습니다.

다만 실제 사용량에는 API 호출, storage read/write, Web Push가 추가됩니다. 따라서 릴리즈 전 실제 Cloudflare Usage를 확인합니다.

## Netlify

기존 Netlify는 v2.0 rollback 용도로만 유지합니다.

개발 브랜치의 Deploy Preview / Branch Deploy는 Netlify credit 기준 0 credits지만, 새 Production deploy는 발생시키지 않는 것을 원칙으로 합니다.

Cloudflare E2E가 통과하면 기존 Netlify scheduled backend는 종료합니다.

## CI 비용

Repository는 public 상태를 유지하고 GitHub Actions에서 standard hosted runner만 사용합니다.

Larger runner, private repository 유료 Actions 사용, 유료 artifact retention 확대는 기본 설정에 포함하지 않습니다.

## 코드 가드

`cloudflare/scripts/free-check.mjs`가 다음을 확인합니다.

- SQLite-backed Durable Objects 사용
- 30초 Alarm이 Free request limit보다 충분히 낮은지
- 예상하지 않은 비용성/불필요 binding이 추가되지 않았는지
- PWA가 Static Assets를 사용하는지

CI에서도 이 검사를 실행합니다.

## 변경 원칙

앞으로 유료 서비스 또는 유료 Cloudflare 기능이 필요해지는 변경은:

1. 코드에 먼저 추가하지 않는다.
2. 비용과 이유를 사용자에게 설명한다.
3. 사용자가 명시적으로 승인한 후에만 진행한다.

기본값은 항상 **무료 유지**입니다.


## 배포 전 무료 검증

실제 Cloudflare 계정에 배포하기 전에 CI는 다음 명령으로 Worker bundle과 Wrangler 설정을 검증합니다.

```bash
npm run dry-run
# 내부: wrangler deploy --dry-run --outdir .wrangler/dry-run
```

이 단계는 Worker를 Cloudflare에 업로드하지 않으므로 배포/사용량을 발생시키지 않습니다.
