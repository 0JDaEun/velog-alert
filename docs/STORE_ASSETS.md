# Chrome Web Store 그래픽 준비

Chrome Web Store 업로드용 그래픽 체크리스트입니다.

## 필수/권장 자산

### Extension Icon

```text
128 x 128 px
```

현재 `assets/icon128.png`이 포함되어 있습니다.

공개 배포 전에는 128px 아이콘에서 실제 심볼이 충분히 크게 보이는지 확인하는 것을 권장합니다.

### Screenshot

최소 1장, 최대 5장.

권장:

```text
1280 x 800 px
```

대안:

```text
640 x 400 px
```

추천 구성:

1. Popup 전체 화면 — 정상 작동 / 자동 확인 상태
2. 댓글 알림이 OS Notification으로 표시된 화면
3. 댓글/답글/좋아요/팔로우 필터 설정
4. 최근 감지 History
5. 인증 상태 및 자동 확인 시간

### Small Promo Tile

```text
440 x 280 px
```

Chrome Web Store 홍보 이미지용.

### Marquee

선택 사항:

```text
1400 x 560 px
```

## 디자인 방향

- 실제 확장 프로그램 UI와 동일한 민트 계열 브랜드 유지
- 과도한 문구 사용 금지
- Chrome Web Store 순위/공식 인증처럼 오인할 문구 사용 금지
- "Velog 공식" 표현 사용 금지
- 실제 기능을 보여주는 스크린샷 사용

참고:
https://developer.chrome.com/docs/webstore/cws-dashboard-listing
https://developer.chrome.com/docs/webstore/images
