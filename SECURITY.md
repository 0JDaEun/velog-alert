# Security Policy

## Supported version

현재 보안 수정 대상 버전은 최신 배포 버전입니다.

| Version | Supported |
|---|---|
| 1.0.4 | Yes |
| 1.0.3 이하 | No |

## 인증정보 처리 원칙

Velog Alert는 Velog의 `access_token`을 요청 인증에 사용하지만 토큰 값을 `chrome.storage`에 저장하지 않습니다.

다음 행위는 금지합니다.

- Console에 인증 토큰 원문 출력
- Issue / README / Screenshot에 쿠키 값 첨부
- 토큰 값을 외부 분석 서비스로 전송
- 디버그 로그에 Authorization 헤더 출력

## 취약점 제보

공개 Issue에 인증 토큰, 쿠키 값 또는 개인정보를 올리지 마세요.

보안 취약점 제보 채널은 저장소 공개 시 별도 이메일 또는 비공개 연락 수단을 설정하는 것을 권장합니다.
