# Velog Alert Troubleshooting

문제가 생겼다면 아래에서 **현재 증상과 가장 비슷한 항목**부터 확인하세요.

> 인증 토큰, 쿠키, Cloudflare Secret 값은 Console에 출력하거나 다른 사람에게 공유하지 마세요.

---

## 빠른 찾기

| 증상 | 먼저 확인할 항목 |
|---|---|
| Extension이 안 보임 | [Chrome Extension 설치](#1-chrome-extension-설치) |
| Velog 로그인 인식 실패 | [Velog 인증](#2-velog-인증) |
| 테스트 알림도 안 옴 | [Desktop 알림](#3-desktop-알림) |
| 수동 확인은 되는데 자동 알림이 안 옴 | [자동 Polling](#4-자동-polling) |
| 팔로잉 새 글이 안 옴 | [팔로잉 새 글](#5-팔로잉-새-글) |
| Relay 연결 실패 | [Cloudflare Relay](#6-cloudflare-relay) |
| 6자리 코드가 안 됨 | [Pairing](#7-pairing) |
| iPhone Push가 안 옴 | [iPhone PWA / Push](#8-iphone-pwa--push) |
| Android Push가 안 옴 | [Android PWA / Push](#9-android-pwa--push) |
| PC OFF 알림이 안 옴 | [Always-on](#10-always-on) |
| 업데이트 후 이상함 | [업데이트](#11-업데이트) |

---

# 1. Chrome Extension 설치

## Extension 목록에 Velog Alert가 없음

Chrome에서:

```text
chrome://extensions
```

를 엽니다.

확인:

```text
개발자 모드 ON
→ 압축해제된 확장 프로그램을 로드합니다
→ manifest.json이 바로 들어 있는 폴더 선택
```

올바른 폴더 예시:

```text
velog-alert-main/
├─ manifest.json
├─ assets/
└─ src/
```

잘못된 선택:

```text
velog-alert-main.zip
src/
assets/
cloudflare/
```

정상 상태:

```text
Velog Alert
Version 2.1.0
```

---

# 2. Velog 인증

## ACCESS_TOKEN_MISSING

Velog 로그인 인증정보를 찾지 못한 상태입니다.

순서대로 확인:

```text
1. Velog 로그인
2. Velog 페이지 새로고침
3. Velog Alert Popup 다시 열기
4. Velog 인증 상태 확인
5. 지금 확인
```

---

## UNAUTHORIZED

현재 Velog 인증이 만료되었거나 API 요청이 인증되지 않은 상태입니다.

```text
Velog 로그인 상태 확인
→ Velog 페이지 새로고침
→ Popup 다시 열기
→ 지금 확인
```

Always-on도 활성화되어 있다면 Desktop 로그인 복구 후 **Velog 인증 다시 연결**도 진행하세요.

---

## EMPTY_RESPONSE

Velog 요청은 성공했지만 유효한 응답 데이터를 받지 못한 경우입니다.

먼저:

1. Velog 로그인 상태
2. 인터넷 연결
3. Velog 페이지 새로고침
4. Extension 새로고침

을 확인합니다.

계속 발생하면 Velog API 응답 구조가 변경되었을 가능성도 있습니다.

---

## BRIDGE_UNAVAILABLE

보조 Velog page bridge를 준비하지 못한 경우입니다.

먼저 Velog 로그인과 직접 인증 경로가 정상인지 확인합니다.

```text
Velog 로그인
→ 페이지 새로고침
→ Extension 새로고침
→ 지금 확인
```

---

# 3. Desktop 알림

## 테스트 알림도 표시되지 않음

Velog 조회 문제가 아니라 **Chrome / OS Notification 권한** 문제일 가능성이 높습니다.

### Windows

```text
Windows 설정
→ 시스템
→ 알림
→ Google Chrome
→ ON
```

### Chrome Extension Service Worker Console

```javascript
chrome.notifications.getPermissionLevel().then(console.log)
```

정상:

```text
granted
```

---

## 신규 이벤트는 잡히는데 OS 알림이 안 뜸

Popup의 알림 필터를 확인합니다.

```text
댓글
답글
좋아요
새 팔로워
팔로우 새 글
```

해당 이벤트가 ON이어야 합니다.

Desktop **테스트 알림**이 정상이라면 Chrome Notification API 자체는 정상입니다.

---

# 4. 자동 Polling

## 수동 '지금 확인'은 되는데 자동 알림이 안 옴

Popup에서 확인:

```text
마지막 자동
다음 자동
```

`다음 자동`이 예약되지 않았다면:

```text
전체 알림 OFF
→ 다시 ON
```

또는 확인 주기를 다시 선택합니다.

Service Worker Console:

```javascript
chrome.alarms.getAll().then(console.log)
```

정상이라면 다음 alarm이 존재해야 합니다.

```text
velog-alert-check
```

---

## 조회 수는 늘었는데 신규가 0

다음은 정상일 수 있습니다.

- 자동 검사에서 이미 해당 이벤트를 처리함
- 동일 Notification ID가 이미 dedup 대상임
- 최초 baseline에 포함된 이벤트임
- 새 팔로우 사용자의 과거 게시물임

새 이벤트를 테스트하려면 **baseline 이후 실제 신규 이벤트**를 발생시키는 것이 가장 정확합니다.

---

# 5. 팔로잉 새 글

Popup에서:

```text
팔로우 새 글: ON
팔로잉 피드: 1 이상
```

인지 확인합니다.

최초 실행에서는 현재 Feed를 baseline으로 저장하므로 기존 게시글은 알림으로 표시하지 않습니다.

정확한 테스트 방법:

```text
이미 이전부터 팔로우 중인 사용자
→ 새 게시물 작성
→ 다음 polling에서 감지
```

새 사용자를 방금 팔로우했다면 Velog가 그 사용자의 최근 게시물을 Feed에 추가할 수 있습니다.  
Velog Alert는 이를 과거 글로 판단해 신규 알림에서 제외할 수 있습니다.

---

# 6. Cloudflare Relay

## RELAY_URL_REQUIRED

Cloudflare Relay URL이 저장되지 않은 상태입니다.

Chrome:

```text
Velog Alert
→ 휴대폰 알림 연결
→ Cloudflare Relay 설정
→ Relay URL 입력
→ 저장 및 연결 확인
```

---

## Relay 연결 확인 실패

먼저 URL 형식을 확인합니다.

올바른 예:

```text
https://velog-alert-mobile.example.workers.dev
```

잘못된 예:

```text
https://*.workers.dev
```

브라우저에서 health endpoint를 확인합니다.

```text
https://내-Relay-URL/api/health
```

정상 응답에는 다음 값이 포함됩니다.

```json
{
  "ok": true,
  "backend": "cloudflare-self-host"
}
```

health가 열리지 않는다면 Cloudflare Worker 배포 상태부터 확인하세요.

---

## Wrangler 로그인이 필요하다고 표시됨

현재 위치:

```text
velog-alert/cloudflare/
```

확인:

```bash
npx wrangler whoami
```

로그인이 안 되어 있다면:

```bash
npx wrangler login --device --use-keyring
```

후 다시 실행합니다.

---

## npm run setup이 안 됨

먼저 현재 폴더를 확인하세요.

정상:

```text
velog-alert/cloudflare/
├─ package.json
├─ wrangler.jsonc
└─ scripts/
```

Node.js 버전:

```bash
node -v
```

**20 이상**이어야 합니다.

---

# 7. Pairing

## 6자리 코드 생성 실패

먼저 Relay 연결이 정상인지 확인합니다.

```text
연결 정상 · cloudflare-self-host · 30초 Cloud polling
```

이 상태가 아니라면 Relay부터 해결합니다.

---

## 코드를 입력했는데 연결되지 않음

Pairing code는:

- 약 10분 유효
- 1회 사용
- 성공 후 폐기

됩니다.

문제가 있으면:

```text
기존 코드 폐기
→ PC에서 새 6자리 코드 생성
→ 휴대폰에서 새 코드 입력
```

순서로 다시 진행합니다.

---

# 8. iPhone PWA / Push

## iPhone에서 Push가 오지 않음

다음을 순서대로 확인합니다.

1. Relay URL을 **Safari**에서 열었는지
2. **공유 → 홈 화면에 추가**를 했는지
3. Safari 탭이 아니라 **홈 화면의 Velog Alert**를 실행했는지
4. 6자리 Pairing이 완료됐는지
5. iOS 알림 권한을 허용했는지
6. PC의 **휴대폰 테스트 알림 보내기**가 성공하는지

> iPhone Web Push는 홈 화면에 설치한 PWA를 기준으로 사용합니다.

---

## iPhone에서 예전 아이콘이 보임

iOS 홈 화면 Web App icon cache 때문일 수 있습니다.

```text
기존 Velog Alert 홈 화면 아이콘 삭제
→ Safari에서 Relay URL 다시 열기
→ 공유
→ 홈 화면에 추가
```

현재 PWA는 versioned icon asset을 사용합니다.

```text
apple-touch-icon-v210.png
icon192-v210.png
icon512-v210.png
```

---

# 9. Android PWA / Push

확인 순서:

```text
Relay URL을 Chrome에서 열기
→ 앱 설치 / 홈 화면에 추가
→ Velog Alert 실행
→ Pairing 완료
→ 알림 권한 허용
→ 테스트 Push
```

연결된 기기 목록에 Android 기기가 표시되는지도 확인합니다.

---

# 10. Always-on

## PC ON에서는 오는데 PC OFF에서는 안 옴

먼저 Always-on 상태를 확인합니다.

정상 예:

```text
Always-on 활성화됨
<Velog username>
마지막 Cloud 확인 ...
```

비활성화 상태라면 **Always-on 전체 알림 활성화**를 진행합니다.

---

## PC를 끄자마자 바로 알림이 안 옴

정상일 수 있습니다.

```text
PC 종료
→ 마지막 heartbeat
→ 약 90초 TTL
→ Cloud polling 시작
→ 다음 polling에서 신규 이벤트 확인
```

따라서 PC 종료 직후에는 즉시 Cloud로 전환되지 않습니다.

---

## Velog 인증 갱신 필요

PC에서:

```text
Velog 로그인 확인
→ Velog 페이지 새로고침
→ Velog Alert
→ 휴대폰 알림 연결
→ Velog 인증 다시 연결
```

을 진행합니다.

---

# 11. 업데이트

## 일반 업데이트 후 Cloudflare가 이상함

일반 업데이트는 다음 명령을 사용합니다.

```bash
cd velog-alert
git pull

cd cloudflare
npm install
npm run validate
npm run deploy
```

> 일반 업데이트 때문에 `npm run setup`을 다시 실행하지 마세요.

---

## Extension 코드 업데이트 후 UI가 예전 상태

Git clone 설치:

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

합니다.

---

# 12. Debug 정보 확인

## Extension state

Service Worker Console:

```javascript
chrome.storage.local.get('velogAlertState').then(console.log)
```

주요 상태:

```text
lastCheckAt
lastSuccessAt
lastAlarmAt
lastFetchedCount
lastNewCount
lastFeedFetchedCount
lastFeedNewCount
lastError
```

> [!CAUTION]
> 인증 토큰, Cookie, Cloudflare Secret을 Console에 출력하거나 Issue / 메신저에 붙여넣지 마세요.

---

## 그래도 해결되지 않을 때

Issue를 작성할 때는 **Secret 없이** 다음 정보만 포함하는 것을 권장합니다.

```text
OS:
Chrome Version:
Velog Alert Version: 2.1.0

증상:
재현 순서:
Popup 오류 메시지:
Relay /api/health 성공 여부:
Desktop 테스트 알림 성공 여부:
Mobile 테스트 Push 성공 여부:
```

Repository:

https://github.com/0JDaEun/velog-alert
