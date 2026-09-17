# Velog Alert Architecture

## V1 Data Flow

```text
Velog Notification
        │
        ▼
v3.velog.io/graphql
        │
        ▼
velog-api.js
        │
        ▼
notification-parser.js
        │
        ▼
notification-detector.js
        │
        ├── 이미 본 ID → 무시
        │
        └── 신규 ID
              │
              ▼
      notification-manager.js
              │
              ▼
      chrome.notifications
              │
              ▼
      사용자 클릭
              │
              ▼
        Velog Post
```

## 핵심 원칙

1. Velog API 의존성 격리
2. 로그인 정보 영구 저장 금지
3. 최초 조회는 baseline 처리
4. 신규 판별은 `is_read`가 아니라 Notification ID 사용
5. 서버 없는 V1
6. API 변경 시 최소 모듈만 수정

## v1.0.2 — Page Bridge Fallback

Service Worker에서 `v3.velog.io/graphql` 호출 시 일부 환경에서
HTTP 200이지만 응답 body가 0 byte인 현상이 확인되었다.

따라서 데이터 수집 경로를 다음처럼 이중화한다.

```text
Service Worker direct fetch
        │
        ├─ 성공 → 그대로 사용
        │
        └─ 실패
             ↓
chrome.offscreen
             ↓
offscreen.html
             ↓
https://velog.io/notifications iframe
             ↓
content script (Velog origin context)
             ↓
https://v3.velog.io/graphql
             ↓
runtime Port
             ↓
Service Worker
```

목표:

- 사용자에게 별도 Velog 탭을 띄우지 않는다.
- 로그인 비밀번호/토큰을 확장 프로그램 저장소에 복사하지 않는다.
- Service Worker origin과 Velog page origin의 차이로 발생하는 응답 문제를 회피한다.
- 정상 동작 시 Popup `조회 경로`에 `Velog 페이지 브리지`를 표시한다.
