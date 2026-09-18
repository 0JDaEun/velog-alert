# Velog Alert 개인정보 처리방침

최종 업데이트: 2026-09-18

Velog Alert는 Velog에서 발생하는 새 활동을 감지해 Chrome과 사용자의 휴대폰 PWA로 알림을 전달하는 오픈소스 프로젝트입니다.

Velog Alert v2.1의 권장 모바일 구조는 **사용자별 Cloudflare Self-host**입니다. 프로젝트 개발자 0JDaEun이 운영하는 중앙 계정에 모든 사용자의 인증정보를 모으는 구조를 기본으로 하지 않습니다.

## 1. 처리하는 정보

### Chrome Extension

기능 제공을 위해 다음 정보를 처리할 수 있습니다.

- Velog `access_token`
- Velog `refresh_token`
- Velog 알림 ID / 종류 / 생성 시각
- 댓글 또는 답글 내용
- 활동을 발생시킨 Velog 사용자 정보
- 게시글 제목과 URL
- 팔로잉 사용자의 공개 게시글 정보
- 알림 종류 설정 및 확인 주기

기본 데스크톱 동작에서는 Velog token 값을 `chrome.storage`에 저장하지 않습니다.

### Always-on Cloudflare

사용자가 **Always-on 전체 알림 활성화**를 명시적으로 선택한 경우에만 현재 Velog access / refresh token을 사용자가 지정한 Relay URL로 전송합니다.

권장 Relay는 사용자가 자신의 Cloudflare 계정에 직접 배포한 Worker입니다.

서버에는 다음 정보가 저장될 수 있습니다.

- AES-GCM으로 암호화된 Velog access / refresh token
- Push Subscription endpoint / p256dh / auth
- 임의 device ID
- 기기 이름
- 해시된 Extension / Device 식별정보
- notification / feed frontier
- 중복 방지용 event key
- 알림 ON/OFF 설정
- 마지막 Cloud 성공/오류 시각
- PC heartbeat 만료 시각
- 일회성 6자리 pairing 정보

Velog 비밀번호는 입력받거나 저장하지 않습니다.

## 2. 이용 목적

정보는 다음 목적으로만 사용합니다.

- 새로운 Velog 활동 판별
- 댓글 / 답글 / 좋아요 / 새 팔로워 / 팔로잉 새 글 감지
- Chrome 및 Web Push 알림
- 중복 알림 방지
- PC ON/OFF 전환
- Velog 인증 갱신
- 연결 기기 관리
- 오류 상태 표시

광고, 사용자 프로파일링 또는 행동 분석 목적으로 사용하지 않습니다.

## 3. 로컬 저장

Chrome 로컬 저장소에는 다음 정보가 저장될 수 있습니다.

- 최근 알림 ID
- 최근 Feed 게시물 ID
- 최근 알림 히스토리
- 클릭용 URL 매핑
- 알림 종류 설정
- 확인 주기
- Relay URL
- 임의 Extension secret
- 마지막 확인 및 오류 진단 메타데이터

Velog access / refresh token 값은 Chrome 로컬 저장소에 복사하지 않습니다.

## 4. Self-host 외부 전송

Always-on을 활성화하면 Extension은 사용자가 설정한 Relay URL과 통신합니다.

권장 구성:

```text
사용자의 Chrome
→ 사용자의 Cloudflare Worker
→ Velog GraphQL
→ 사용자의 Web Push 기기
```

따라서 다른 개발자가 이 프로젝트를 Self-host하면 해당 사용자의 데이터는 해당 사용자의 Cloudflare 계정에서 처리됩니다.

프로젝트 개발자 0JDaEun의 중앙 Cloudflare 계정을 모든 사용자에게 공유하는 방식을 기본 배포 구조로 사용하지 않습니다.

## 5. 암호화

Always-on Velog token은 서버 저장 전 AES-256-GCM으로 암호화합니다.

암호화 master key는 Cloudflare Secret으로 설정하며 Durable Object 저장 데이터와 분리합니다.

다음 원칙을 적용합니다.

- token 원문 로그 출력 금지
- Authorization / Cookie 원문 로그 출력 금지
- Velog 비밀번호 수집 금지
- HTTPS Relay만 권장
- Secret을 Git 저장소에 commit하지 않음

## 6. 데이터 삭제

사용자는 Extension에서 **Always-on 해제 및 인증 삭제**를 실행해 Cloud에 저장된 Velog 인증정보를 삭제할 수 있습니다.

휴대폰 PWA의 **이 기기 연결 해제**를 통해 Push Subscription 연결을 제거할 수 있습니다.

Self-host Cloudflare Worker 자체를 삭제하면 해당 backend를 더 이상 사용할 수 없습니다.

Chrome Extension을 제거하면 브라우저의 Extension 로컬 저장 데이터도 제거됩니다.

## 7. 6자리 Pairing

Pairing code는 휴대폰과 Extension을 연결하는 임시 코드입니다.

- 6자리 숫자
- 약 10분 유효
- 성공 후 삭제
- 장기 인증정보로 사용하지 않음

## 8. Web Push

휴대폰 알림 전달을 위해 브라우저가 생성한 Web Push Subscription을 저장합니다.

새 활동을 전달할 때 다음 데이터가 Push payload에 포함될 수 있습니다.

- 알림 제목
- 알림 본문
- Velog 관련 URL
- 이벤트 중복 방지 key
- 생성 시각

## 9. 외부 분석

Velog Alert 자체에는 다음 기능을 포함하지 않습니다.

- Google Analytics
- 광고 SDK
- 마케팅용 사용자 추적 SDK
- 사용자 데이터 판매 기능

## 10. Chrome 권한

### cookies
현재 Velog 로그인 세션의 인증정보를 확인하는 데 사용합니다.

### alarms
데스크톱에서 설정한 주기로 새 활동을 확인하는 데 사용합니다.

### notifications
Chrome / 운영체제 알림을 표시하는 데 사용합니다.

### storage
사용자 설정과 중복 방지 상태를 로컬에 저장합니다.

### offscreen / velog.io
직접 인증 경로 실패 시 Velog 페이지 context fallback에 사용합니다.

### v3.velog.io
Velog GraphQL 조회에 사용합니다.

### *.workers.dev
사용자가 자신의 Cloudflare Worker를 Relay URL로 사용하는 Self-host 기능에 사용합니다.

## 11. 주의사항

Velog Alert는 Velog 공식 제품이 아니며 Velog 웹 서비스가 사용하는 인터페이스에 의존합니다.

Velog의 인증 방식, GraphQL schema 또는 서비스 정책이 변경되면 기능이 중단되거나 업데이트가 필요할 수 있습니다.

## 12. 문의

Developer: 0JDaEun

Repository: https://github.com/0JDaEun/velog-alert

개인정보 또는 보안 관련 문의는 GitHub Issue를 통해 제보할 수 있습니다. 인증 token, cookie 원문 또는 개인정보를 공개 Issue에 첨부하지 마세요.
