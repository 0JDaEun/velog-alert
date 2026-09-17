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

## v1.1.0 — Following Feed

```text
Alarm / Manual check
       ↓
Velog Alert Snapshot
       ├─ notifications
       ├─ currentUser
       └─ feedPosts
                ↓
          followings query
                ↓
      Feed Post Detector
       ├─ 기존 seen post → ignore
       ├─ 새 팔로우 사용자의 backfill → baseline
       └─ 기존 팔로잉 사용자의 unseen post → notify
                ↓
        Chrome Notification
```

상태는 기존 Velog Notification과 별도로 유지한다.

```text
feedInitialized
seenFeedPostIds
knownFollowingUserIds
lastFeedFetchedCount
lastFeedNewCount
lastFeedSuccessAt
lastFeedError
```

팔로잉 Feed 조회 실패는 일반 댓글/답글 알림 실패와 분리하여 처리한다.
