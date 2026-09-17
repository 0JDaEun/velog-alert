# Troubleshooting

## 테스트 알림도 표시되지 않음

Velog 문제가 아니라 Chrome/OS Notification 문제일 가능성이 높습니다.

확인:

```text
Windows 설정
→ 시스템
→ 알림
→ Google Chrome
→ ON
```

Service Worker Console:

```javascript
chrome.notifications.getPermissionLevel().then(console.log)
```

정상:

```text
granted
```

## ACCESS_TOKEN_MISSING

Velog 인증 쿠키를 찾지 못한 상태입니다.

1. Velog 로그인
2. Velog 페이지 새로고침
3. Popup의 `Velog 인증` 확인
4. 다시 `지금 확인`

## UNAUTHORIZED

현재 access token이 만료되었거나 서버가 인증을 인정하지 않은 상태입니다.

Velog 페이지를 새로고침하여 세션을 갱신한 뒤 다시 테스트합니다.

## EMPTY_RESPONSE

Velog GraphQL 응답이 성공 상태이지만 본문이 없는 경우입니다.

v1.0.4에서는 Bearer 인증이 기본 경로이므로 먼저 다음을 확인합니다.

```text
Velog 인증: 로그인 확인
조회 경로: 백그라운드 인증
```

## BRIDGE_UNAVAILABLE

보조 Velog 페이지 브리지를 만들지 못했습니다.

v1.0.4에서 주 인증 경로는 브리지가 아니므로 먼저 `ACCESS_TOKEN_MISSING` 또는 Bearer 인증 경로 오류가 함께 있는지 확인합니다.

## 수동 확인은 되는데 자동 알림이 안 옴

Popup에서 확인:

```text
마지막 자동
다음 자동
```

`다음 자동`이 `미예약`이라면 전체 알림을 OFF → ON 하거나 확인 주기를 다시 선택합니다.

Service Worker Console:

```javascript
chrome.alarms.getAll().then(console.log)
```

`velog-alert-check`가 있어야 합니다.

## 조회 수는 늘었는데 신규가 0

다음 가능성이 있습니다.

- 자동 검사에서 이미 해당 ID를 처리함
- 동일 알림 ID가 `seenNotificationIds`에 존재함
- 첫 실행 baseline에 포함됨

## 신규 1인데 OS 알림이 안 뜸

Popup 필터 확인:

```text
댓글 / 답글 / 좋아요 / 팔로우
```

해당 종류가 ON인지 확인합니다.

테스트 알림이 정상이라면 OS Notification API 자체는 정상입니다.

## 디버그 상태 확인

Service Worker Console:

```javascript
chrome.storage.local.get('velogAlertState').then(console.log)
```

확인할 주요 값:

```text
lastCheckAt
lastSuccessAt
lastAlarmAt
lastFetchedCount
lastNewCount
lastTransport
lastError
```

인증 토큰 또는 쿠키 값을 Console에 출력하거나 공유하지 마세요.
