# Velog Alert

Velog에서 발생한 **댓글, 답글, 좋아요, 팔로우**를 주기적으로 확인하고 Chrome 데스크톱 알림으로 알려주는 Manifest V3 확장 프로그램입니다.

> Velog Alert는 Velog 공식 제품이 아닌 독립 프로젝트입니다.

## 주요 기능

- Velog 새 댓글 자동 감지
- 내 댓글에 달린 새 답글 감지
- 좋아요 / 팔로우 알림 선택적 활성화
- Chrome / Windows 데스크톱 알림
- 알림 클릭 시 관련 Velog 페이지 이동
- 최근 감지 기록 확인
- 알림 종류별 ON/OFF
- 확인 주기 1 / 5 / 10 / 30분
- 수동 `지금 확인`
- Chrome 알림 동작 확인용 테스트 알림
- 중복 알림 방지
- 최초 설치 시 기존 알림 일괄 발송 방지
- Chrome 재시작 및 Manifest V3 Service Worker 재기동 대응

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

- Chrome 109+
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

**v1.0.4**

2026-09-17 실제 Chrome 환경에서 다음 흐름을 확인했습니다.

```text
Velog 로그인
→ 주기적 알림 확인
→ 신규 활동 감지
→ Chrome 팝업 알림
```

자동 테스트는 `npm test` 기준 12개 테스트를 통과합니다.

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
