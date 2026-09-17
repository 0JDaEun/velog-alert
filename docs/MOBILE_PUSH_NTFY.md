# Mobile Push — ntfy

v2.0은 Supabase나 별도 백엔드 없이 `ntfy.sh`로 휴대폰 알림을 전달합니다.

```text
Velog → Chrome Extension → ntfy.sh → ntfy iOS / Android
```

## 설정

1. 휴대폰에 ntfy 앱을 설치합니다.
2. Velog Alert의 `휴대폰 알림 설정`을 엽니다.
3. 휴대폰 알림을 켭니다.
4. 자동 생성된 Topic을 복사합니다.
5. 휴대폰 ntfy 앱에서 해당 Topic을 구독합니다.
6. `휴대폰 테스트 알림 보내기`를 눌러 확인합니다.

## 보안

Topic은 24-byte cryptographically random 값으로 생성되며 Topic 자체를 비밀값처럼 사용합니다.
Topic을 공개하지 마세요. 노출이 의심되면 `새 Topic`을 생성하면 됩니다.

휴대폰 알림을 켠 경우 ntfy.sh로 알림 제목, 본문, 관련 Velog URL이 전송됩니다.
Velog access token, refresh token, cookie, 비밀번호는 ntfy.sh로 보내지 않습니다.

## 제한

PC와 Chrome이 완전히 꺼져 있으면 Extension이 새 이벤트를 감지할 수 없으므로 휴대폰 알림도 전송되지 않습니다.
PC가 꺼져 있어도 항상 동작하는 기능은 별도 실행 서버가 필요하므로 기본 v2.0에서는 제외합니다.
