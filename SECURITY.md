# Security Policy

## Supported version

| Version | Supported |
|---|---|
| 2.1.x | Yes |
| 2.0.x | Security fixes only until v2.1 release |
| 1.x | No |

## Self-host 보안 모델

Velog Alert v2.1은 각 사용자가 자신의 Cloudflare 계정에 Relay를 배포하는 Self-host 구조를 권장합니다.

```text
사용자 Chrome
→ 사용자 Cloudflare Worker
→ 사용자 Durable Object
→ 사용자 Web Push
```

프로젝트 개발자 0JDaEun의 중앙 Cloudflare 계정에 모든 사용자의 Velog 인증정보를 모으는 방식을 기본 구조로 사용하지 않습니다.

## Velog 인증정보

데스크톱 기본 동작에서는 Velog token을 요청 시점에만 읽고 `chrome.storage`에 저장하지 않습니다.

사용자가 Always-on 기능을 명시적으로 활성화한 경우에는 PC OFF 조회를 위해 access / refresh token을 자신의 Cloudflare Worker로 전송합니다.

Cloud 저장 전 다음 보호를 적용합니다.

- AES-256-GCM
- Cloudflare Secret 기반 master key
- HTTPS
- plaintext token 로그 금지

## 금지 사항

- Console에 Velog token 원문 출력
- Authorization / Cookie 원문 logging
- GitHub Issue에 cookie/token 게시
- screenshot에 인증 값 노출
- `.dev.vars` 또는 실제 secret 파일 commit
- 사용자 동의 없이 Always-on 인증정보 업로드

## Secret 파일

`npm run setup`은 배포를 위해 임시 secret 파일을 생성할 수 있으며 배포 후 제거합니다.

실제 Secret 값은 Git에 commit하지 마세요.

## Relay URL

공개 릴리즈에서는 사용자 본인의 HTTPS `*.workers.dev` URL 또는 직접 관리하는 HTTPS Worker domain 사용을 권장합니다.

신뢰할 수 없는 제3자의 Relay URL을 입력하면 해당 운영자가 전송된 Always-on 인증정보를 처리할 수 있으므로 사용하지 마세요.

## 취약점 제보

Repository: https://github.com/0JDaEun/velog-alert

공개 Issue에 인증 token, cookie, VAPID private key, AUTH_KEY 또는 개인정보를 첨부하지 마세요.
