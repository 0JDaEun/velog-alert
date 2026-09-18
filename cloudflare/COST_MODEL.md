# Cloudflare 비용 모델 — Self-host Edition

기준일: 2026-09-18

## 권장 운영 방식

Velog Alert의 공개 배포는 중앙 Cloudflare 계정 하나를 여러 사용자가 공유하는 방식이 아니라,
**각 사용자가 자신의 Cloudflare Free 계정에 Worker를 하나씩 배포하는 Self-host 방식**을 기본으로 합니다.

따라서 사용자 수가 늘어도 개발자 0JDaEun의 Cloudflare 사용량과 비용은 증가하지 않습니다.

## 사용자 1명 기준

Cloud polling 목표:

```text
30초
```

하루 polling cycle:

```text
24 × 60 × 60 / 30
= 2,880 cycles / day
```

Cloudflare Durable Objects Free:

- Requests: 100,000 / day
- Duration: 13,000 GB-s / day
- SQLite rows read: 5,000,000 / day
- SQLite rows written: 100,000 / day
- SQLite storage: 5 GB

단순 Alarm request만 비교하면:

```text
2,880 / 100,000
= 2.88%
```

즉 사용자 한 명이 자기 계정에서 30초 polling을 사용하는 것은 request quota 기준으로 매우 여유가 있습니다.

## Duration 보수적 예시

Durable Object가 polling cycle마다 128 MB를 사용한다고 단순 가정할 때:

### 평균 2초

```text
2,880 × 2 sec × 0.125 GB
= 720 GB-s/day
```

Free 13,000 GB-s/day의 약 5.5%.

### 평균 5초

```text
2,880 × 5 sec × 0.125 GB
= 1,800 GB-s/day
```

Free의 약 13.8%.

실제 값은 Cloudflare 실행시간과 Velog 응답시간에 따라 달라집니다.

## PC ON 최적화

Chrome Extension heartbeat가 유효하면 Cloud Velog polling을 생략합니다.

따라서 사용자가 PC를 하루 중 절반 정도 켜 둔다면 실제 Velog Cloud 조회량은 단순 2,880회/day보다 훨씬 적어질 수 있습니다.

## 사용자 수가 늘어날 때

Self-host 방식에서는 사용자 수가 서버비로 누적되지 않습니다.

| 전체 사용자 | 개발자 0JDaEun Cloudflare 비용 | 각 사용자 |
|---:|---:|---|
| 1 | $0 | Free |
| 10 | $0 | 각자 Free |
| 100 | $0 | 각자 Free |
| 1,000 | $0 | 각자 Free |
| 10,000 | $0 | 각자 Cloudflare 계정 quota 사용 |

단, 이것은 **Cloudflare 비용 관점**입니다.

Velog 전체 요청량은 서비스 사용자 수에 비례해 증가하므로 Velog의 rate limit 또는 API 정책이 실제 확장성의 핵심 제약이 될 수 있습니다.

## 왜 30초보다 짧게 하지 않는가

Cloudflare Free quota만 보면 더 짧은 polling도 가능하지만,
Velog에 불필요하게 많은 GraphQL 요청을 만들지 않기 위해 30초를 하한으로 둡니다.

Velog Alert는 Velog 공식 webhook 제품이 아니므로 30초 polling을 **준실시간**으로 표현합니다.

## 유료 전환

각 사용자는 기본적으로 Workers Free로 사용할 수 있습니다.

사용자가 자신의 다른 Worker들과 quota를 공유해 Free 한도를 자주 넘기는 경우에만 본인이 Workers Paid를 선택하면 됩니다.

현재 Workers Paid의 기본 요금은 계정당 약 $5/month이며, 프로젝트 개발자가 다른 사용자의 Cloudflare 비용을 대신 부담하지 않습니다.

## 운영 원칙

1. 중앙 인증 서버를 강제하지 않는다.
2. 사용자마다 자신의 Cloudflare 계정을 사용한다.
3. 자동 Paid 전환 기능을 만들지 않는다.
4. 30초보다 짧은 polling을 기본 제공하지 않는다.
5. PC ON heartbeat로 Cloud polling을 줄인다.
6. Velog 인증정보는 각 사용자 Cloudflare에 AES-GCM 암호화 저장한다.
7. Extension에서 언제든 Always-on 인증정보를 삭제할 수 있게 한다.
