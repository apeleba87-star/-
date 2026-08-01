# 클린아이덱스 앱 (Flutter MVP)

오염·세제로 **희석·사용법**을 바로 찾는 Android 앱입니다. Magam(마감링크)과 별도입니다.

## 실행

```bash
cd cleanidex_app
flutter pub get
flutter run
```

콘텐츠 갱신 (모노레포 루트에서):

```bash
npm run export:cleanidex-app
```

## 화면

| 탭/화면 | 역할 |
|--------|------|
| 홈 | 검색, 빠른 오염 칩, 오염/세제 갈래, 최근 사용법 |
| 오염 | 오염 목록 → 추천 세제·사용법 |
| 세제 | 목록·상세(희석 강조, 상황별 사용법) |
| 사용법 | 레시피 전체 스텝·주의 |

## 패키지

- Application ID: `com.cleanidex.cleanidex_app`
- 콘텐츠: `assets/data/mvp_bundle.json`
- DTO 계약: [`docs/cleanidex-app-mvp-dto.md`](../docs/cleanidex-app-mvp-dto.md)

## 스토어

[`store/play-listing.md`](store/play-listing.md) 참고.
