# Cloudflare 비용 모델 — Velog Alert

기준일: 2026-09-18

이 문서는 Velog Alert의 Cloudflare Free-first 구조에서 사용자 수가 증가할 때의 대략적인 비용을 계산하기 위한 운영 기준입니다.

## 공식 가격 기준

Workers Paid는 계정 기준 최소 **$5 / month**입니다.

Paid 기준 주요 Durable Objects 포함량/초과요금:

- Requests: 1,000,000 / month 포함, 이후 $0.15 / million
- Duration: 400,000 GB-s / month 포함, 이후 $12.50 / million GB-s
- SQLite rows read: 25B / month 포함
- SQLite rows written: 50M / month 포함
- SQL stored data: 5 GB-month 포함

Free 주요 한도:

- Workers requests: 100,000 / day
- Durable Object requests: 100,000 / day
- Durable Object duration: 13,000 GB-s / day
- SQLite rows written: 100,000 / day
- SQLite storage: 5 GB

Static Asset requests는 무료이며 무제한입니다.

## Velog Alert 계산 가정

현재 Free-first 설계:

- Cloud poll: 5분
- PollShard당 최대 16 사용자
- 한 Shard Alarm에서 최대 16개의 Velog 계정 검사
- 사용자별 여러 이벤트가 한 polling cycle에 동시에 발생하면 모바일 Push 하나로 요약
- 휴대폰 최대 2개
- PC가 켜져 있을 때는 향후 heartbeat로 Cloud polling을 생략
- 아래 비용표는 **모든 사용자가 PC OFF 24시간**인 보수적인 worst-case

Alarm 횟수:

```text
5분 주기
= shard당 288회 / day
= shard당 8,640회 / 30-day month
```

Duration은 실제 Velog 응답시간에 따라 달라지므로 다음 범위로 계산합니다.

```text
빠른 경우: shard alarm 2초
느린 경우: shard alarm 5초
```

## 5분 Always-on — Paid 예상

| 사용자 | Shard | 예상 월 비용 |
|---:|---:|---:|
| 100 | 7 | 약 $5 |
| 300 | 19 | 약 $5 |
| 500 | 32 | 약 $5 |
| 1,000 | 63 | 약 $5 |
| 2,000 | 125 | 약 $5 ~ $17.5 |
| 5,000 | 313 | 약 $17.8 ~ $30.3 |
| 10,000 | 625 | 약 $18.2 ~ $43.2 |

주의: Cloudflare Durable Object duration 초과 사용량은 billing unit 단위로 반올림될 수 있으므로 비용이 연속적으로 증가하지 않고 계단식으로 증가할 수 있습니다.

## 10분 Always-on으로 완화할 경우

| 사용자 | Shard | 예상 월 비용 |
|---:|---:|---:|
| 100 | 7 | 약 $5 |
| 500 | 32 | 약 $5 |
| 1,000 | 63 | 약 $5 |
| 2,000 | 125 | 약 $5 |
| 5,000 | 313 | 약 $5.1 ~ $17.6 |
| 10,000 | 625 | 약 $17.8 ~ $30.3 |

## Free 사용자 수 해석

Cloudflare 계산상 5분 polling도 수백~천 단위까지 가능할 수 있지만, **Cloudflare 한도가 유일한 제약은 아닙니다.**

가장 중요한 외부 제약은 Velog입니다.

```text
100 users   × 288 = 28,800 Velog requests/day
500 users   × 288 = 144,000 Velog requests/day
1,000 users × 288 = 288,000 Velog requests/day
```

Velog는 Velog Alert용 공식 Push/Webhook API를 제공하는 것이 아니므로, 이 규모의 polling을 Velog 측이 장기적으로 허용한다고 가정해서는 안 됩니다.

따라서 실제 공개 운영은 다음 단계로 확장합니다.

```text
0~100 users
→ Free beta
→ 5분 polling

100~300
→ 응답시간 / 429 / 실패율 관찰
→ adaptive polling 적용

300~1,000
→ PC heartbeat 적극 활용
→ quiet user 10분 전환 검토

1,000+
→ Velog upstream 호출량이 핵심 병목
→ 10~15분 또는 추가 최적화 필요
```

## 비용보다 먼저 볼 지표

- Cloudflare DO requests/day
- DO GB-s/day
- SQLite writes/day
- Velog HTTP 429 비율
- Velog GraphQL 평균 응답시간
- Cloud polling 성공률
- PC ON 비율
- Cloud poll이 실제 필요했던 사용자 비율
- 사용자당 하루 실제 신규 알림 수

## 비용 보호 정책

1. Free plan에서 시작
2. 자동 유료 업그레이드 금지
3. 사용자 승인 전 Workers Paid 전환 금지
4. 5분보다 짧은 Cloud polling 금지
5. PC ON이면 Cloud Velog 조회 생략
6. idle storage write 최소화
7. 사용자 증가 시 5 → 10 → 15분 adaptive polling 가능
8. 비용/Velog 부하 threshold를 넘으면 신규 Always-on 등록 제한 가능
