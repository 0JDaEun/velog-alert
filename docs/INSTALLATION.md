# Velog Alert v2.1 설치 및 초기 설정

Developer: **0JDaEun**

Repository: https://github.com/0JDaEun/velog-alert

## 1. Chrome Extension 설치

현재 Chrome Web Store 등록 전이므로 ZIP 배포를 기준으로 합니다.

1. 최신 `Velog_Alert_v2.1.0_EXTENSION.zip` 다운로드
2. ZIP 압축 해제
3. Chrome에서 `chrome://extensions`
4. **개발자 모드** ON
5. **압축해제된 확장 프로그램을 로드합니다**
6. `manifest.json`이 있는 폴더 선택

ZIP 파일 자체를 Chrome에 넣는 방식이 아니라 반드시 압축을 해제해야 합니다.

## 2. Velog 로그인

1. https://velog.io 에 로그인
2. Velog Alert Popup 열기
3. Velog 인증 상태 확인
4. **지금 확인** 한 번 실행

최초 확인은 현재 데이터의 baseline을 생성하므로 과거 알림을 한꺼번에 표시하지 않습니다.

## 3. 기본 확인 주기

v2.1 기본값은 **30초**입니다.

```text
30초 (기본)
1분
5분
10분
30분
```

30초 모드는 Chrome 120 이상을 요구합니다.

## 4. 자신의 Cloudflare Relay 배포

PC가 꺼진 상태에서도 약 30초 단위로 알림을 받으려면 자신의 Cloudflare Free 계정에 backend를 배포합니다.

필요 환경:

- Node.js 20+
- Cloudflare Free 계정
- Git

터미널:

```bash
git clone https://github.com/0JDaEun/velog-alert.git
cd velog-alert/cloudflare
npm install
npx wrangler login --device --use-keyring
npm run setup
```

`npm run setup`은 다음 작업을 자동 수행합니다.

- AES-256-GCM AUTH_KEY 생성
- VAPID key pair 생성
- Secret 업로드
- Worker / Durable Objects / PWA 배포
- 임시 secret 파일 삭제

완료 후 Wrangler가 표시하는 URL을 복사합니다.

예:

```text
https://velog-alert-mobile.<your-subdomain>.workers.dev
```

상세 문서: [CLOUDFLARE_SELF_HOST.md](CLOUDFLARE_SELF_HOST.md)

## 5. Relay URL 입력

Chrome Velog Alert:

```text
휴대폰 알림 연결
→ 개발 설정
→ Relay URL
→ 자신의 workers.dev URL 입력
→ 저장 및 연결 확인
```

**연결 정상 · cloudflare-self-host · 30초 Cloud polling**이 표시되는지 확인합니다.

Relay URL을 바꾸면 휴대폰 PWA origin도 바뀌므로 새 Relay URL에서 휴대폰을 다시 연결해야 합니다.

## 6. 휴대폰 PWA 연결

PC에서 **6자리 연결 코드 만들기**를 누릅니다.

### Android

1. Extension에 표시된 자신의 Relay URL을 Chrome에서 열기
2. Chrome 메뉴 → 앱 설치 또는 홈 화면에 추가
3. 홈 화면의 Velog Alert 실행
4. PC의 6자리 코드 입력
5. **알림 허용 및 연결**
6. 알림 권한 허용

### iPhone

1. 자신의 Relay URL을 Safari에서 열기
2. 공유 → **홈 화면에 추가**
3. 홈 화면의 Velog Alert 실행
4. PC의 6자리 코드 입력
5. 알림 허용
6. **알림 허용 및 연결**

iPhone Web Push는 홈 화면에 추가한 PWA에서 사용합니다.

## 7. 휴대폰 Push 테스트

Extension 휴대폰 설정에서:

```text
연결된 기기
→ 새로고침
→ 휴대폰 테스트 알림 보내기
```

테스트 Push가 휴대폰에 표시되는지 확인합니다.

## 8. PC OFF 전체 알림

Extension 설정:

```text
PC가 꺼져 있어도 모든 알림 받기
→ Always-on 전체 알림 활성화
```

확인창에는 현재 Velog access / refresh token을 자신의 Relay로 전송해 암호화 저장한다는 설명이 표시됩니다.

Velog 비밀번호는 사용하지 않습니다.

활성화 후 상태가:

```text
Always-on 활성화됨
<Velog username>
마지막 Cloud 확인 ...
```

으로 표시되는지 확인합니다.

## 9. 동작 방식

```text
PC ON
→ Chrome Extension 약 30초 확인
→ Cloud heartbeat
→ Cloud Velog polling 생략

PC OFF
→ heartbeat 만료
→ Cloudflare Durable Object가 약 30초 polling
→ Web Push
```

PC를 종료한 직후에는 마지막 heartbeat TTL 때문에 Cloud 전환까지 추가 시간이 발생할 수 있습니다.

## 10. 실제 테스트

다른 Velog 계정을 이용해 다음을 확인합니다.

- 댓글
- 답글
- 좋아요
- 새 팔로워
- 기존 팔로잉 사용자의 새 글

각 알림이 PC ON과 PC OFF에서 정상적으로 수신되는지 확인합니다.

## 11. 제거

### Cloud 인증만 삭제
Extension → **Always-on 해제 및 인증 삭제**

### 휴대폰 연결 삭제
PWA → **이 기기 연결 해제**

### 전체 Cloud backend 삭제
Cloudflare Dashboard에서 자신이 만든 Worker를 삭제합니다.

### Chrome Extension 삭제
`chrome://extensions`에서 Velog Alert 제거
