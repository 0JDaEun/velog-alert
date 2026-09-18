# Velog Alert

Velog에서 발생한 **댓글, 답글, 좋아요, 팔로우, 팔로잉 사용자의 새 게시물**를 주기적으로 확인하고 Chrome 데스크톱 알림으로 알려주는 Manifest V3 확장 프로그램입니다.

> Velog Alert는 Velog 공식 제품이 아닌 독립적인 오픈소스 프로젝트입니다.

Repository: https://github.com/0JDaEun/velog-alert

## 주요 기능

- Velog 새 댓글 자동 감지
- 내 댓글에 달린 새 답글 감지
- 좋아요 / 팔로우 알림 선택적 활성화
- Chrome / Windows 데스크톱 알림
- 알림 클릭 시 관련 Velog 페이지 이동
- 최근 감지 기록 확인
- 알림 종류별 ON/OFF
- 확인 주기 30초 / 1 / 5 / 10 / 30분
- 수동 `지금 확인`
- Chrome 알림 동작 확인용 테스트 알림
- 중복 알림 방지
- 최초 설치 시 기존 알림 일괄 발송 방지
- Chrome 재시작 및 Manifest V3 Service Worker 재기동 대응
- 팔로우한 Velog 사용자의 새 게시물 감지
- 새 팔로우 시 최근 게시글 backfill 오탐 방지

## 동작 구조

```text
chrome.alarms
      ↓
Service Worker
      ↓
Velog 인증 쿠키 확인
      ↓
Authorization: Bearer
      ↓
https://v3.velog.io/graphql
      ↓
Notification Parser
      ↓
seenNotificationIds 비교
      ↓
새 알림만 선별
      ↓
chrome.notifications
      ↓
사용자 클릭
      ↓
Velog 게시글
```

Velog API 직접 인증 경로가 실패하는 경우를 대비해 Velog 페이지 브리지 fallback도 포함되어 있습니다.

## 현재 설치 방식

> 현재 Velog Alert는 Chrome Web Store 정식 등록 전입니다. 따라서 다른 사용자는 ZIP 파일을 내려받아 **Chrome 개발자 모드에서 직접 설치**해야 합니다.

```text
ZIP 다운로드
→ 압축 해제
→ chrome://extensions
→ 개발자 모드 ON
→ "압축해제된 확장 프로그램을 로드합니다"
→ manifest.json이 들어있는 폴더 선택
```

ZIP 파일 자체를 Chrome에 넣는 방식은 아니며, 반드시 먼저 압축을 풀어야 합니다. Chrome Web Store 등록 후에는 이 수동 설치 과정 없이 일반 확장 프로그램처럼 설치할 수 있도록 변경할 예정입니다.

## 설치

### 개발자 모드에서 설치

1. 이 저장소를 내려받거나 Release ZIP의 압축을 풉니다.
2. Chrome 주소창에 `chrome://extensions`를 입력합니다.
3. 우측 상단 **개발자 모드**를 켭니다.
4. **압축해제된 확장 프로그램을 로드합니다**를 누릅니다.
5. `manifest.json`이 있는 `velog-alert` 폴더를 선택합니다.
6. Velog에 로그인합니다.
7. Velog Alert Popup에서 `Velog 인증: 로그인 확인`을 확인합니다.
8. `지금 확인`을 한 번 눌러 현재 알림을 baseline으로 저장합니다.

자세한 내용은 [`docs/INSTALLATION.md`](docs/INSTALLATION.md)를 참고하세요.

## 팔로잉 새 글 감지

v1.1.0부터 Velog의 로그인 사용자 전용 `feedPosts`를 함께 확인합니다.

```text
내가 팔로우한 사용자
        ↓
새 게시물 발행
        ↓
Velog Feed
        ↓
Velog Alert 신규 ID 비교
        ↓
Chrome Notification
```

새 사용자를 팔로우하면 Velog가 해당 사용자의 최근 게시물을 Feed에 추가할 수 있기 때문에,
Velog Alert는 현재 팔로잉 목록도 함께 비교합니다. 이번 검사에서 새로 팔로우된 사용자의
기존 게시물은 baseline으로 처리하고 새 글 알림으로 표시하지 않습니다.

## 최초 실행이 알림을 띄우지 않는 이유

첫 조회에서는 현재 존재하는 Velog 알림을 모두 **기준점(Baseline)** 으로 저장합니다.

```text
확장 설치
→ 현재 알림 25개 조회
→ 25개 ID 저장
→ OS 알림은 표시하지 않음
```

이후 새롭게 생성된 ID만 Chrome 알림으로 표시합니다. 따라서 설치 직후 오래된 알림이 한꺼번에 표시되지 않습니다.

## 기본 설정

30초 빠른 확인 모드는 Chrome 120 이상에서 사용할 수 있습니다. 기본 확인 주기는 1분이며, 더 빠른 알림이 필요하면 Popup에서 30초로 변경할 수 있습니다.


| 항목 | 기본값 |
|---|---|
| 전체 알림 | ON |
| 댓글 | ON |
| 답글 | ON |
| 좋아요 | OFF |
| 팔로우 | OFF |
| 확인 주기 | 1분 |
| 로컬 히스토리 | 최대 50개 |
| 중복 판별용 ID | 최대 200개 |

## 권한

Velog Alert는 기능 수행에 필요한 Chrome 권한을 사용합니다.

| 권한 | 용도 |
|---|---|
| `alarms` | 설정한 주기에 맞춰 Velog 알림 확인 |
| `cookies` | 현재 로그인된 Velog 인증 쿠키 확인 |
| `notifications` | 새 활동을 Chrome/OS 알림으로 표시 |
| `storage` | 설정, 최근 알림 ID, 히스토리를 브라우저 로컬에 저장 |
| `offscreen` | 직접 인증 경로 실패 시 Velog 페이지 브리지 fallback |
| `https://velog.io/*` | Velog 인증 및 fallback 페이지 접근 |
| `https://v3.velog.io/*` | Velog GraphQL 알림 조회 |

## 개인정보 및 인증정보

- Velog 비밀번호를 요구하거나 저장하지 않습니다.
- `access_token`은 GraphQL 요청 인증을 위해 실행 중에만 읽습니다.
- 인증 토큰 값을 `chrome.storage`에 저장하지 않습니다.
- 별도의 개발자 서버, Supabase, Analytics 서버로 알림 데이터를 보내지 않습니다.
- 조회한 알림 데이터 중 필요한 일부는 최근 기록 기능을 위해 사용자의 Chrome 로컬 저장소에 저장됩니다.
- 네트워크 요청은 Velog 서비스에 필요한 요청으로 제한됩니다.

자세한 내용은 [`PRIVACY.md`](PRIVACY.md)를 참고하세요.

## 개발

필요 환경:

- Chrome 120+
- Node.js 20+ 권장

테스트:

```bash
npm test
```

문법 검사:

```bash
npm run check
```

## 프로젝트 구조

```text
velog-alert/
├── manifest.json
├── assets/
├── src/
│   ├── api/
│   ├── background/
│   ├── bridge/
│   ├── constants/
│   ├── core/
│   ├── offscreen/
│   ├── popup/
│   └── storage/
├── tests/
├── docs/
├── PRIVACY.md
├── SECURITY.md
├── CHANGELOG.md
└── README.md
```

## 현재 상태

**v1.1.0**

2026-09-17 실제 Chrome 환경에서 다음 흐름을 확인했습니다.

```text
Velog 로그인
→ 주기적 알림 확인
→ 신규 활동 감지
→ Chrome 팝업 알림
```

자동 테스트는 `npm test` 기준 21개 테스트를 통과합니다.

## 문제 해결

아래 상황은 [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)를 참고하세요.

- `ACCESS_TOKEN_MISSING`
- `UNAUTHORIZED`
- `EMPTY_RESPONSE`
- `BRIDGE_UNAVAILABLE`
- 테스트 알림은 뜨지만 실제 Velog 알림이 안 뜨는 경우
- 자동 확인 시간이 갱신되지 않는 경우

## Chrome Web Store

배포 준비 자료:

- [`docs/CHROME_WEB_STORE.md`](docs/CHROME_WEB_STORE.md)
- [`docs/STORE_ASSETS.md`](docs/STORE_ASSETS.md)
- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md)

## 주의

Velog Alert는 Velog 웹 서비스가 사용하는 인터페이스에 의존합니다. Velog의 내부 API 또는 인증 방식이 변경되면 확장 프로그램 업데이트가 필요할 수 있습니다.

## Mobile PWA (v2.0 개발 중)

Android와 iPhone에서 별도 앱스토어 설치 없이 홈 화면에 추가하는 PWA를 개발 중입니다.

```text
PC Extension
→ 6자리 연결 코드

Phone PWA
→ 코드 입력
→ 알림 허용
→ Web Push
```

### 휴대폰 알림 연결

PC의 Velog Alert에서 `휴대폰 알림 연결 ↗`을 누르고 6자리 코드를 생성합니다.

**Android**

1. Chrome에서 `https://velog-alert-mobile.netlify.app` 접속
2. 메뉴 → **앱 설치** 또는 **홈 화면에 추가**
3. 홈 화면의 Velog Alert 실행
4. PC의 6자리 코드 입력
5. **알림 허용 및 연결** → 알림 권한 허용

**iPhone**

1. Safari에서 `https://velog-alert-mobile.netlify.app` 접속
2. 공유 → **홈 화면에 추가**
3. 홈 화면의 Velog Alert 실행
4. PC의 6자리 코드 입력
5. **알림 허용 및 연결** → 알림 권한 허용

연결 코드는 생성 후 10분 동안 한 번만 사용할 수 있습니다.

구현 상세는 [`docs/MOBILE_PWA_CODE_PAIRING.md`](docs/MOBILE_PWA_CODE_PAIRING.md)를 참고하세요.


## PC가 꺼져 있을 때

휴대폰 알림을 연결한 뒤 Extension이 팔로잉 목록을 한 번 동기화하면, Netlify Scheduled Function이 공개 Velog 게시물을 약 1분 간격으로 확인합니다.

```text
PC OFF
  ↓
Netlify Scheduled Function
  ↓
Velog 공개 새 게시물 확인
  ↓
팔로잉 username 비교
  ↓
Web Push
  ↓
Android / iPhone PWA
```

따라서 **팔로잉 사용자의 새 게시물**은 PC가 꺼져 있어도 받을 수 있습니다.

댓글, 답글, 좋아요, 새 팔로워는 Velog 개인 인증이 필요한 알림이므로 현재 버전에서는 PC Chrome Extension이 실행 중일 때 모바일로 전달됩니다. 서버에는 Velog 인증 토큰이나 쿠키를 저장하지 않습니다.


## v2.1 Self-host Cloudflare

공개 배포 버전은 **사용자마다 자신의 Cloudflare Free 계정에 Relay를 배포**하는 방식을 권장합니다.

```text
각 사용자
Chrome Extension
    ↓
본인 Cloudflare Worker / Durable Object
    ↓ 약 30초
Velog
    ↓
본인 Android / iPhone PWA
```

이 방식에서는 프로젝트 개발자 `0JDaEun`의 서버 비용이나 quota를 여러 사용자가 공유하지 않습니다.

PC가 켜져 있으면 Chrome Extension이 약 30초 간격으로 확인하고, PC가 꺼지면 개인 Cloudflare backend가 약 30초 polling으로 대신 확인합니다.

Cloudflare 설치: [docs/CLOUDFLARE_SELF_HOST.md](docs/CLOUDFLARE_SELF_HOST.md)

Developer: [0JDaEun](https://github.com/0JDaEun)
