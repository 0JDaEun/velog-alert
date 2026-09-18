# Cloudflare Self-host 설치

Velog Alert v2.1의 권장 배포 방식은 **사용자마다 자신의 Cloudflare Free 계정에 Relay를 하나씩 배포하는 방식**입니다.

이 구조에서는 개발자 0JDaEun의 서버 계정을 여러 사용자가 공유하지 않습니다.

```text
각 사용자
├─ 자신의 Chrome Extension
├─ 자신의 Cloudflare Worker / Durable Object
├─ 자신의 암호화된 Velog 인증정보
└─ 자신의 Android / iPhone PWA
```

## 장점

- PC를 꺼도 약 30초 간격으로 Velog 새 활동 확인
- 사용자마다 Cloudflare Free quota를 별도로 사용
- 중앙 서버 운영비 없음
- 다른 사용자의 Velog 인증정보와 완전히 분리
- 서버를 직접 삭제하면 Cloud 데이터도 같이 제거 가능

> Velog는 Velog Alert용 공식 실시간 Webhook을 제공하지 않으므로 엄밀한 event-driven 실시간은 아닙니다. 현재 목표는 **약 30초 polling 기반 준실시간**입니다.

## 1. 준비

필요한 것:

- GitHub
- Cloudflare Free 계정
- Node.js 20+
- Chrome 120+
- Velog 로그인 계정

Cloudflare Workers Paid 가입은 필요하지 않습니다.

## 2. 저장소 받기

```bash
git clone https://github.com/0JDaEun/velog-alert.git
cd velog-alert/cloudflare
npm install
```

Cloudflare 로그인(지원되는 OS에서는 OAuth 자격증명을 OS keychain에 보관):

```bash
npx wrangler login --use-keyring
```

## 3. 한 번에 설정 + 배포

```bash
npm run setup
```

스크립트가 자동으로:

0. Node.js 버전 및 Cloudflare 로그인 상태 확인
1. Free-only 구조 검사
2. 실제 배포 전 Wrangler dry-run

3. AES-256-GCM AUTH_KEY 생성
4. Web Push VAPID key pair 생성
5. Cloudflare Secret 파일을 임시 생성
6. Worker + Durable Objects + PWA 배포
7. 임시 Secret 파일 삭제

를 수행합니다.

Wrangler 출력 마지막에 나타나는:

```text
https://<worker-name>.<your-subdomain>.workers.dev
```

주소를 복사합니다.

## 4. Extension에 Relay URL 입력

Chrome:

```text
Velog Alert
→ 휴대폰 알림 연결
→ 개발 설정
→ Relay URL
```

에 자신의 `https://*.workers.dev` 주소를 붙여넣고 저장합니다.

## 5. 휴대폰 연결

1. PC에서 6자리 연결 코드 생성
2. 자신의 Workers URL을 휴대폰에서 열기
3. Android Chrome 또는 iPhone Safari에서 홈 화면에 추가
4. PWA 실행
5. 6자리 코드 입력
6. 알림 허용

## 6. PC OFF 전체 알림 활성화

Extension 설정의:

```text
PC가 꺼져 있어도 모든 알림 받기
→ Always-on 전체 알림 활성화
```

를 누릅니다.

이때 Extension이 현재 Velog access_token / refresh_token을 읽어 **사용자 자신의 Cloudflare Worker**로 전송합니다.

Cloudflare에는 AES-GCM 암호문만 저장합니다.

Velog 비밀번호는 사용하지 않습니다.

## 7. 준실시간 동작

```text
PC ON
→ Chrome Extension: 약 30초
→ Cloud heartbeat 전송
→ Cloud Velog polling 생략

PC OFF
→ heartbeat 약 90초 후 만료
→ Cloudflare Durable Object Alarm
→ 약 30초마다 Velog 확인
→ Web Push
```

PC를 막 끈 직후에는 마지막 heartbeat TTL 때문에 Cloud 전환까지 최대 약 90초가 추가될 수 있습니다.
그 이후에는 약 30초 polling으로 동작합니다.

## 8. Free quota

사용자 1명이 24시간 PC OFF라고 가정하면:

```text
30초 polling
= 2,880 alarm cycles / day
```

Cloudflare Durable Objects Free의 100,000 requests/day보다 충분히 작습니다.

따라서 **각 사용자가 자기 Cloudflare 계정을 사용하는 방식에서는 소규모 개인 사용이 Free quota에 매우 여유롭습니다.**

실제 제한은 Cloudflare보다 Velog 쪽 요청 정책이 먼저 문제가 될 수 있으므로 polling은 30초보다 짧게 설정하지 않습니다.

## 9. 삭제

Cloudflare Dashboard에서 해당 Worker를 삭제하면 자신의 Cloud backend를 제거할 수 있습니다.

Extension에서 `Always-on 해제 및 인증 삭제`를 먼저 누르면 저장된 Velog 인증정보를 즉시 삭제할 수 있습니다.

## Developer

- GitHub: https://github.com/0JDaEun
- Repository: https://github.com/0JDaEun/velog-alert
