# Netlify Deploy — Mobile PWA v2.0

## 현재 프로젝트

- Netlify project: `velog-alert-mobile`
- GitHub repository: `0JDaEun/velog-alert`
- 테스트 branch: `feat/mobile-pwa-code-pairing-v2`
- Production URL target: `https://velog-alert-mobile.netlify.app`

## 1회 연결

Netlify 프로젝트에서 GitHub 저장소를 연결한다.

```text
Repository: 0JDaEun/velog-alert
Production branch: feat/mobile-pwa-code-pairing-v2
Build command: 비워 둠
```

`netlify.toml`이 다음 설정을 관리한다.

```toml
[build]
  publish = "pwa"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

별도의 Supabase, DB migration, VAPID 환경변수 입력은 필요하지 않다.
VAPID key pair는 서버에서 첫 Push 설정 요청 시 생성되어 Netlify Blobs에 저장된다.

## 배포 후 Smoke Test

### PWA

```text
https://velog-alert-mobile.netlify.app
```

페이지가 열리고 Android/iPhone 설치 안내와 6자리 코드 입력 UI가 표시되어야 한다.

### Push config

```text
GET /api/push/config
```

예상 응답:

```json
{
  "vapidPublicKey": "..."
}
```

### Extension pairing

Chrome Extension → `휴대폰 알림 연결` → `6자리 연결 코드 만들기`.

정상이라면 10분 유효의 다음 형태 코드가 표시된다.

```text
123 456
```

## Phone E2E

### Android

```text
Chrome에서 PWA 접속
→ 앱 설치
→ PC의 6자리 코드 입력
→ 알림 허용
→ 휴대폰 테스트 알림
```

### iPhone

```text
Safari에서 PWA 접속
→ 공유
→ 홈 화면에 추가
→ 홈 화면의 Velog Alert 실행
→ PC의 6자리 코드 입력
→ 알림 허용
→ 휴대폰 테스트 알림
```

## 최종 검증

테스트 Push가 성공한 뒤 실제 Velog 이벤트에 대해 다음을 확인한다.

```text
댓글 / 답글 / 좋아요 / 새 팔로워 / 팔로잉 새 글
        ↓
Desktop Chrome Notification
        +
Mobile Web Push
```

## Main 병합 후

PR #3의 실제 Android/iPhone E2E까지 통과한 다음 `main`에 병합한다.
Netlify Production branch도 그때 `main`으로 변경한다.
