# Velog Alert v2.1 설치 가이드

이 문서는 **처음 설치하는 사용자용 전체 순서**입니다.

> PC 알림만 필요하면 **STEP 1 ~ STEP 3**까지만 진행하면 됩니다.  
> 모바일 / PC OFF 알림까지 사용하려면 **STEP 4 이후**도 진행하세요.

---

## 0. 먼저 설치 범위를 선택하세요

| 원하는 기능 | 진행할 단계 |
|---|---|
| PC Chrome 알림만 | STEP 1 → 2 → 3 |
| PC + 모바일 Push | STEP 1 → 2 → 3 → 4 → 5 → 6 → 7 |
| PC OFF 모바일 알림 | STEP 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 |

전체 흐름:

```text
Extension 준비
→ Chrome 등록
→ Velog 최초 확인
→ Cloudflare 배포
→ Relay URL 연결
→ PWA 설치 / Pairing
→ 테스트 Push
→ Always-on
```

---

# STEP 1. Extension 파일 준비

## 방법 A — GitHub ZIP 사용

Repository:

```text
https://github.com/0JDaEun/velog-alert
```

1. GitHub에서 **Code** 버튼을 누릅니다.
2. **Download ZIP**을 선택합니다.
3. 내려받은 `velog-alert-main.zip`을 압축 해제합니다.

압축 해제 후 다음 구조가 보여야 합니다.

```text
velog-alert-main/
├─ manifest.json       ← 반드시 이 위치에 있어야 함
├─ assets/
├─ src/
├─ cloudflare/
├─ docs/
└─ ...
```

> [!IMPORTANT]
> Chrome에 등록할 때는 ZIP 파일이 아니라  
> **`manifest.json`이 바로 들어 있는 `velog-alert-main/` 폴더**를 선택합니다.

## 방법 B — Git clone 사용

```bash
git clone https://github.com/0JDaEun/velog-alert.git
cd velog-alert
```

이 경우 폴더 구조:

```text
velog-alert/
├─ manifest.json       ← Chrome Extension manifest
├─ assets/
├─ src/
├─ cloudflare/
└─ ...
```

Chrome에서 선택할 폴더는 저장소 루트 **`velog-alert/`** 입니다.

### 정상 상태

다음 중 하나가 준비되어 있으면 STEP 1 완료입니다.

```text
velog-alert-main/manifest.json
```

또는

```text
velog-alert/manifest.json
```

---

# STEP 2. Chrome Extension 등록

1. Chrome 주소창에 아래 주소를 입력합니다.

```text
chrome://extensions
```

2. 우측 상단 **개발자 모드**를 켭니다.
3. **압축해제된 확장 프로그램을 로드합니다**를 누릅니다.
4. STEP 1에서 준비한 폴더를 선택합니다.

선택 기준:

```text
✅ manifest.json이 바로 들어 있는 폴더
❌ velog-alert-main.zip
❌ src/
❌ assets/
❌ cloudflare/
```

### 정상 상태

Chrome 확장 프로그램 목록에 다음이 표시됩니다.

```text
Velog Alert
Version 2.1.0
```

필요하면 Chrome 툴바의 퍼즐 아이콘에서 **Velog Alert 고정**을 선택합니다.

---

# STEP 3. Velog 로그인 및 Desktop 알림 확인

1. Chrome에서 Velog에 로그인합니다.
2. Velog 페이지를 한 번 새로고침합니다.
3. Velog Alert Popup을 엽니다.
4. **Velog 인증** 상태를 확인합니다.
5. **테스트 알림**을 눌러 Chrome Notification을 확인합니다.
6. **지금 확인**을 누릅니다.

### 최초 확인이 조용한 것이 정상입니다

첫 조회는 현재 Velog 상태를 baseline으로 저장합니다.

```text
첫 조회
→ 현재 상태 저장
→ 과거 이벤트 알림 X

다음 조회부터
→ 이전 상태와 비교
→ 신규 이벤트만 알림
```

따라서 설치 직후 과거 댓글이나 좋아요가 한꺼번에 뜨지 않습니다.

### 기본 설정

| 설정 | 기본값 |
|---|:---:|
| 전체 알림 | ON |
| 댓글 | ON |
| 답글 | ON |
| 좋아요 | OFF |
| 새 팔로워 | OFF |
| 팔로우 새 글 | ON |
| 확인 주기 | 30초 |

PC 알림만 사용할 경우 **설치 완료**입니다.

---

# STEP 4. Cloudflare Relay 최초 배포

모바일 Push 또는 PC OFF Always-on을 사용할 경우 진행합니다.

## 준비물

- Node.js 20 이상
- npm
- Git
- Cloudflare Free 계정

버전 확인:

```bash
node -v
npm -v
```

Node.js 20 미만이면 setup이 중단됩니다.

---

## 4-1. 저장소 준비

GitHub ZIP으로 Extension을 설치했더라도, Cloudflare 배포는 Git clone 사용을 권장합니다.

```bash
git clone https://github.com/0JDaEun/velog-alert.git
cd velog-alert
cd cloudflare
```

### 현재 위치 확인

명령을 실행하는 폴더는 반드시:

```text
velog-alert/cloudflare/
```

입니다.

이 폴더에는 다음 파일이 있습니다.

```text
cloudflare/
├─ package.json
├─ wrangler.jsonc
├─ scripts/
├─ src/
└─ public/
```

---

## 4-2. 의존성 설치

현재 위치:

```text
velog-alert/cloudflare/
```

실행:

```bash
npm install
```

---

## 4-3. Cloudflare 로그인

```bash
npx wrangler login --device --use-keyring
```

브라우저가 열리면 자신의 Cloudflare 계정으로 로그인하고 권한을 승인합니다.

로그인 확인:

```bash
npx wrangler whoami
```

Cloudflare 계정 정보가 출력되면 정상입니다.

---

## 4-4. 최초 setup

현재 위치:

```text
velog-alert/cloudflare/
```

실행:

```bash
npm run setup
```

setup 과정:

```text
Node.js 버전 확인
→ Cloudflare 로그인 확인
→ Free-only 구조 검사
→ VAPID 연락 이메일 입력
→ AUTH_KEY 생성
→ VAPID Key pair 생성
→ 임시 Secret 파일 생성
→ Wrangler dry-run
→ Worker / Durable Objects / PWA 배포
→ 임시 Secret 파일 삭제
```

중간에:

```text
VAPID 연락 이메일:
```

이 표시되면 본인이 사용할 이메일을 입력합니다.

### 정상 상태

배포 완료 후 Wrangler가 다음 형태의 URL을 출력합니다.

```text
https://<worker-name>.<your-subdomain>.workers.dev
```

이 URL을 **Cloudflare Relay URL**이라고 부릅니다.

> 이 하나의 URL이 Worker API 주소이자 모바일 PWA 주소입니다.

---

## 4-5. Relay health 확인

브라우저에서:

```text
https://내-Relay-URL/api/health
```

를 엽니다.

정상 응답 예시:

```json
{
  "ok": true,
  "service": "velog-alert",
  "version": "2.1.0",
  "backend": "cloudflare-self-host",
  "pollIntervalSeconds": 30
}
```

여기까지 정상이라면 Cloudflare 배포 완료입니다.

---

# STEP 5. Extension에 Relay URL 연결

Chrome에서:

```text
Velog Alert
→ 휴대폰 알림 연결
→ Cloudflare Relay 설정
```

Relay URL 입력란에 STEP 4에서 받은 실제 주소를 붙여넣습니다.

예:

```text
https://velog-alert-mobile.example.workers.dev
```

그리고 **저장 및 연결 확인**을 누릅니다.

### 정상 상태

```text
연결 정상 · cloudflare-self-host · 30초 Cloud polling
```

이 표시되면 완료입니다.

> [!CAUTION]
> `https://*.workers.dev`를 그대로 입력하면 안 됩니다.  
> 반드시 Wrangler가 출력한 **본인의 실제 URL**을 입력하세요.

### Relay URL을 바꿨다면

Relay URL이 바뀌면 PWA origin도 바뀝니다.

```text
Relay URL 변경
→ 새 주소에서 PWA 다시 설치 / 연결
```

이 필요합니다.

---

# STEP 6. 휴대폰 PWA 설치 및 Pairing

먼저 PC 설정 화면에서:

```text
휴대폰 알림 사용 → ON
→ 6자리 연결 코드 만들기
```

를 진행합니다.

연결 코드는:

- 6자리
- 약 10분 유효
- 1회 사용
- 연결 성공 후 폐기

됩니다.

---

## Android

1. Android Chrome에서 **Cloudflare Relay URL**을 엽니다.
2. Chrome 메뉴 **⋮**를 누릅니다.
3. **앱 설치** 또는 **홈 화면에 추가**를 선택합니다.
4. 홈 화면의 **Velog Alert**를 실행합니다.
5. PC에 표시된 6자리 코드를 입력합니다.
6. 기기 이름을 입력합니다.
7. **알림 허용 및 연결**을 누릅니다.
8. 브라우저 알림 권한을 허용합니다.

### 정상 상태

PWA에:

```text
연결 완료
```

가 표시됩니다.

---

## iPhone

1. **Safari**에서 Cloudflare Relay URL을 엽니다.
2. **공유** 버튼을 누릅니다.
3. **홈 화면에 추가**를 선택합니다.
4. **추가**를 눌러 Velog Alert를 설치합니다.
5. Safari 탭을 닫아도 됩니다.
6. **홈 화면의 Velog Alert 아이콘**으로 앱을 실행합니다.
7. PC의 6자리 코드를 입력합니다.
8. 기기 이름을 입력합니다.
9. **알림 허용 및 연결**을 누릅니다.
10. iOS 알림 권한을 허용합니다.

> [!IMPORTANT]
> iPhone에서는 Safari 탭이 아니라 **홈 화면에 설치한 Velog Alert PWA**에서 Pairing / Push 연결을 진행하세요.

---

# STEP 7. 휴대폰 테스트 Push

PC Extension의 휴대폰 설정에서:

```text
연결된 기기
→ 새로고침
```

을 누릅니다.

방금 연결한 휴대폰이 표시되면:

```text
휴대폰 테스트 알림 보내기
```

를 누릅니다.

정상 Push:

```text
Velog Alert 모바일 테스트
휴대폰 Web Push 연결이 정상입니다.
```

테스트 Push가 오지 않는다면 Always-on을 켜기 전에 먼저:

1. Relay 연결
2. PWA 설치
3. Pairing
4. 휴대폰 알림 권한

을 확인하세요.

문제 해결: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

# STEP 8. PC OFF Always-on 활성화

테스트 Push가 정상적으로 도착한 뒤 진행합니다.

PC 설정에서:

```text
PC가 꺼져 있어도 모든 알림 받기
→ Always-on 전체 알림 활성화
```

를 누릅니다.

확인창 내용을 읽고 동의하면 현재 Velog access / refresh token을 **본인의 Cloudflare Relay**로 전송합니다.

- Velog 비밀번호는 전송하지 않습니다.
- Token은 AES-256-GCM으로 암호화합니다.
- 암호화 key는 Cloudflare Secret으로 관리합니다.

### 정상 상태

```text
Always-on 활성화됨
<Velog username>
마지막 Cloud 확인 ...
```

---

# PC ON / PC OFF 동작

```text
PC ON
→ Extension이 약 30초 주기로 Velog 확인
→ Cloudflare heartbeat 전송
→ Cloud polling 생략

PC OFF
→ heartbeat 중단
→ 약 90초 후 TTL 만료
→ Cloudflare polling 시작
→ 새 이벤트가 있으면 Web Push
```

PC 종료 직후에는 약 90초 heartbeat TTL과 다음 polling 시점 때문에 바로 전환되지 않을 수 있습니다.

---

# 업데이트 방법

## Extension 업데이트

Git clone으로 설치했다면:

```bash
cd velog-alert
git pull
```

그 다음:

```text
chrome://extensions
→ Velog Alert
→ 새로고침
```

을 누릅니다.

GitHub ZIP으로 설치했다면 새 `velog-alert-main.zip`을 내려받아 압축을 다시 풀고 Extension을 새로고침합니다.

---

## Cloudflare 업데이트

> [!WARNING]
> 일반 업데이트에서는 `npm run setup`을 다시 실행하지 않습니다.

실행:

```bash
cd velog-alert
git pull

cd cloudflare
npm install
npm run validate
npm run deploy
```

모바일 PWA 코드가 포함된 업데이트라면 배포 후 **홈 화면의 Velog Alert를 한 번 실행**해 최신 Service Worker를 적용하세요.

```text
Worker 재배포
→ 홈 화면 Velog Alert 한 번 실행
→ 앱 종료
→ 다음 새 알림부터 클릭 테스트
```

기존 사용자는 이 과정에서 다음 설정을 다시 할 필요가 없습니다.

```text
6자리 Pairing 재설정 X
알림 권한 재허용 X
Always-on 재활성화 X
Relay URL 재입력 X
Velog 인증 재연결 X
```

각 명령의 역할:

| 명령 | 역할 |
|---|---|
| `npm run validate` | Free-only 검사 + TypeScript 검사 + Wrangler dry-run |
| `npm run deploy` | 기존 Secret을 유지한 상태로 새 코드 배포 |
| `npm run setup` | **최초 설치용** key 생성 + Secret 등록 + 배포 |

---

# 제거 방법

## Always-on 인증만 삭제

```text
Extension
→ 휴대폰 알림 연결
→ Always-on 해제 및 인증 삭제
```

## 휴대폰 연결 해제

PWA에서:

```text
이 기기 연결 해제
```

## Chrome Extension 삭제

```text
chrome://extensions
→ Velog Alert
→ 삭제
```

## Cloudflare backend 전체 삭제

Cloudflare Dashboard에서 본인이 배포한 Velog Alert Worker를 삭제합니다.

Cloud backend까지 완전히 제거할 경우:

```text
Always-on 인증 삭제
→ 휴대폰 연결 해제
→ Worker 삭제
```

순서를 권장합니다.

---

# 설치 완료 체크리스트

## PC

- [ ] Chrome에 Velog Alert 2.1.0 표시
- [ ] Velog 로그인 인식
- [ ] Desktop 테스트 알림 수신
- [ ] 지금 확인 성공

## 모바일

- [ ] Relay health 정상
- [ ] Extension Relay 연결 정상
- [ ] PWA 홈 화면 설치
- [ ] 6자리 Pairing 완료
- [ ] 휴대폰 테스트 Push 수신

## PC OFF

- [ ] Always-on 활성화
- [ ] Velog username 표시
- [ ] 마지막 Cloud 확인 시간 표시

---

## 다음 문서

- Cloudflare 배포/업데이트 상세: [CLOUDFLARE_SELF_HOST.md](CLOUDFLARE_SELF_HOST.md)
- 오류 해결: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 보안 모델: [../SECURITY.md](../SECURITY.md)
- 개인정보 처리: [../PRIVACY.md](../PRIVACY.md)
