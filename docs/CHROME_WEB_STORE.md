# Chrome Web Store 제출 초안

## 1. Single Purpose

```text
Velog에서 발생한 새 댓글, 답글, 좋아요, 팔로우와 내가 팔로우한 사용자의 새 게시물을 주기적으로 확인하고 Chrome 알림으로 전달합니다.
```

모든 기능은 Velog 활동 알림이라는 하나의 목적에 직접 연결됩니다.

## 2. Short Description

```text
Velog의 새 댓글·답글과 팔로잉 사용자의 새 글을 자동 확인해 Chrome 알림으로 알려줍니다.
```

## 3. Detailed Description

```text
Velog Alert는 Velog에서 발생한 새로운 활동을 주기적으로 확인해 Chrome 데스크톱 알림으로 알려주는 확장 프로그램입니다.

주요 기능
- 새 댓글 및 답글 알림
- 좋아요 및 새 팔로워 알림 선택 설정
- 팔로우한 사용자의 새 게시물 알림
- 알림 종류별 ON/OFF
- 1·5·10·30분 확인 주기
- 최근 감지 알림 히스토리
- 알림 클릭 시 관련 Velog 페이지 이동
- 중복 알림 방지
- 테스트 알림 및 자동 확인 상태 확인

Velog Alert는 별도의 개발자 서버나 Analytics 서비스를 사용하지 않습니다. Velog 인증정보는 알림 조회를 위해 필요한 범위에서만 사용하며 인증 토큰 값을 확장 프로그램 로컬 저장소에 보관하지 않습니다.

이 확장 프로그램은 Velog 공식 제품이 아닌 독립 프로젝트입니다.
```

## 4. Permission Justifications

### alarms

사용자가 설정한 1·5·10·30분 주기에 따라 Velog의 새 알림을 백그라운드에서 확인하기 위해 사용합니다.

### cookies

사용자가 현재 Chrome에서 로그인한 Velog 세션의 access_token을 확인하고 Velog 알림 API 요청을 인증하기 위해 사용합니다. 토큰 값은 로컬 저장소에 저장하지 않습니다.

### notifications

새로운 Velog 댓글·답글·좋아요·팔로우 또는 팔로잉 사용자의 새 게시물이 감지되었을 때 Chrome/운영체제 알림을 표시하기 위해 사용합니다.

### storage

사용자 알림 설정, 중복 방지용 알림 ID, 최근 알림 기록 및 마지막 확인 상태를 사용자 브라우저 로컬에 저장하기 위해 사용합니다.

### offscreen

기본 백그라운드 인증 경로가 사용할 수 없는 경우 Velog 페이지 컨텍스트를 이용해 알림을 조회하는 fallback을 제공하기 위해 사용합니다.

### https://velog.io/*

Velog 로그인 세션 확인과 fallback 알림 조회에 필요한 Velog 페이지 접근에 사용합니다.

### https://v3.velog.io/*

Velog GraphQL 서버에서 현재 사용자의 알림 데이터를 조회하기 위해 사용합니다.

## 5. Remote Code

Dashboard 선택: `No, I am not using remote code.`

## 6. Data Disclosure

- Velog access token
- Velog 로그인 세션 상태
- 댓글 및 답글 내용
- 게시글 제목 및 URL
- Velog 사용자 표시 이름
- 알림 종류 및 생성 시각
- 팔로잉 사용자 식별정보
- 팔로잉 사용자의 공개 게시글 제목, URL, 발행 시각

## 7. Data Sharing

별도의 개발자 서버, 광고 네트워크 또는 Analytics 서비스와 공유하지 않으며 기능 제공을 위해 Velog 서비스와만 통신합니다.
