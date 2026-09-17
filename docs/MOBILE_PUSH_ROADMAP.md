# Mobile Push Roadmap

Velog Alert의 휴대폰 알림 확장 계획입니다.

## v2.0.0 — Extension → Phone Push

```text
Velog
  ↓
Chrome Extension
  ↓
새 이벤트 감지
  ↓
Push Gateway
  ↓
Web Push
  ↓
Android / iPhone PWA
```

초기 버전은 PC의 Chrome Extension이 이벤트를 감지하고 휴대폰으로 전달합니다.
Velog 인증 토큰은 Cloud에 저장하지 않는 구조를 우선합니다.

### 구성 후보

- Supabase
  - 기기 pairing
  - push subscription 저장
  - Edge Function
  - event deduplication
- Mobile PWA
  - Web Push 등록
  - 알림 클릭 시 Velog 게시글 이동
  - 모바일 알림 종류 ON/OFF

## v2.1.0 — Always-on Following Post Push

팔로잉 사용자의 공개 게시글은 Cloud에서 확인할 수 있도록 확장합니다.

```text
Supabase Cron
  ↓
팔로잉 공개 게시글 확인
  ↓
신규 게시글 판별
  ↓
Web Push
  ↓
Phone
```

이 단계에서는 Velog 로그인 토큰을 서버에 저장하지 않고,
Extension이 동기화한 팔로잉 사용자 목록과 공개 게시글만 사용합니다.

## v2.2.0 — Optional Cloud Mode

댓글, 답글, 좋아요, 팔로우처럼 개인 인증이 필요한 Velog Notification까지
PC가 꺼진 상태에서 전달하려면 별도 Cloud Mode가 필요합니다.

이 모드는 다음 보안 설계가 선행되어야 합니다.

- 명시적 사용자 동의
- 인증정보 암호화
- token rotation / revoke
- logout / device removal
- Privacy Policy 개정
- 서버 로그의 credential redaction

v2.0 / v2.1과 분리하여 선택 기능으로 설계합니다.
