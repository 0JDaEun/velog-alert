# Phase 0 — Velog 알림 구조 조사 결과

조사 기준일: 2026-09-17

## 1. 결론

Velog 알림은 자체 GraphQL Notification API로 조회할 수 있으며, 현재 다음 네 가지 타입을 확인했다.

- `comment`
- `commentReply`
- `postLike`
- `follow`

따라서 게시글별 댓글 크롤링 대신 Velog 자체 알림 GraphQL을 사용한다.

## 2. Notification Query

```graphql
query notification($input: NotificationsInput!) {
  notifications(input: $input) {
    id
    type
    action
    actor_id
    action_id
    is_read
    created_at
  }
}
```

V1에서는 확장 프로그램 자체의 `seenNotificationIds`와 비교해 신규 여부를 판별한다.

## 3. 알림 Action 데이터

### comment

- comment_id
- post_id
- post_title
- post_url_slug
- post_writer_username
- comment_text
- actor_display_name
- actor_username
- actor_thumbnail

### commentReply

- comment_id
- parent_comment_text
- post_id
- post_url_slug
- post_writer_username
- reply_comment_text
- actor 정보

### postLike

- post_like_id
- post_id
- post_title
- post_url_slug
- post_writer_username
- actor 정보

### follow

- follow_id
- actor_user_id
- actor_display_name
- actor_username
- actor_thumbnail

## 4. 게시글 URL

```text
https://velog.io/@{post_writer_username}/{post_url_slug}
```

## 5. 인증 조사

Velog 서버 인증은 다음 방식을 사용할 수 있다.

1. `access_token` cookie
2. `refresh_token` cookie
3. `Authorization: Bearer <access token>`

초기에는 Service Worker에서 `credentials: include` 직접 호출을 시도했으나 실제 Chrome 환경에서 `HTTP 200 + Body 0 bytes`가 발생했다.

페이지 브리지 fallback도 검증했지만 자동 백그라운드 동작에서 `BRIDGE_UNAVAILABLE` 문제가 발생할 수 있었다.

최종 v1.0.4에서는 Chrome Cookies API로 현재 Velog `access_token`을 읽고, 이를 영구 저장하지 않은 채 `Authorization: Bearer` 헤더로 GraphQL 요청을 수행한다.

```text
chrome.alarms
→ Service Worker
→ chrome.cookies
→ access_token
→ Authorization: Bearer
→ v3.velog.io/graphql
```

## 6. 핵심 설계 결정

- 게시글 자체를 주기적으로 크롤링하지 않는다.
- Velog `is_read`는 확장 프로그램 신규 판별 기준으로 사용하지 않는다.
- 최초 설치 시 현재 Notification ID를 baseline으로 저장한다.
- 인증 토큰 값은 `chrome.storage`에 저장하지 않는다.
- Velog API 의존성은 `velog-api.js`, `velog-auth.js`, parser 모듈에 격리한다.

## 7. Risk

### 비공식 내부 API

Velog 내부 GraphQL 및 인증 구조 변경 시 업데이트가 필요할 수 있다.

### 인증 구조 변경

Cookie 이름, domain 또는 Bearer 처리 방식이 바뀌면 `velog-auth.js` 수정이 필요하다.

### Schema 변경

`action`이 JSON 타입이므로 defensive parsing을 유지한다.

## 8. 최종 검증 상태

- [x] Velog 알림 Query 확인
- [x] 알림 타입 확인
- [x] 댓글/답글 데이터 확인
- [x] URL 생성 규칙 확인
- [x] Bearer 인증 지원 확인
- [x] 실제 Chrome 인증 성공
- [x] 실제 계정 Notification 조회
- [x] Chrome Notification 표시
- [x] 자동 Alarm 기반 조회
- [x] 실제 신규 활동 자동 알림

Phase 0 및 인증 검증 상태: **COMPLETE**
