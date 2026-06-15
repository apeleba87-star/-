# 마감링크 — Google Play 출시 체크리스트

Android **Play Store** 정식 출시용입니다. 코드·Console 작업을 순서대로 진행하세요.

---

## 0. 지금 코드에 반영된 것

| 항목 | 위치 |
|------|------|
| 회원 탈퇴 (앱) | 설정 → 회원 탈퇴 |
| 탈퇴 API | `POST /api/magam/delete-account` (Bearer 토큰) |
| 고객지원 페이지 | `https://cleanidex.co.kr/magam/support` |
| 로그인 약관·개인정보 링크 | 로그인 화면 하단 |
| UGC 이용약관 동의 | 글쓰기 화면 (등록 전 필수) |
| 릴리스 서명 스캐폴드 | `android/key.properties.example` + `build.gradle.kts` |

**웹 배포 필요:** 탈퇴 API·고객지원 페이지는 **cleanidex.co.kr에 배포**된 뒤 앱에서 동작합니다.

---

## 1. 당신이 먼저 할 일 (계정·일정)

### Play Console

1. [Google Play Console](https://play.google.com/console) 개발자 등록 ($25, 1회)
2. **신원·연락처 검증** 완료 (2025~26 강화)
3. **개인 계정**이고 2023-11-13 이후 생성이면 → **클로즈드 테스트 12명 × 14일** 필수  
   → 지금 Console 만들고 **내부/클로즈드 트랙에 AAB 올리는 날**부터 14일 시계 시작

### 지원 이메일

`.env` / Vercel에 실제 수신 가능한 주소 설정:

```env
MAGAM_SUPPORT_EMAIL=help@cleanidex.co.kr
```

---

## 2. 업로드 키 만들기 (1회)

PowerShell (`magam_app/android` 폴더):

```powershell
cd C:\proj\newslett\magam_app\android
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

1. `key.properties.example` → `key.properties` 복사 후 비밀번호·경로 입력  
2. `upload-keystore.jks`와 `key.properties`는 **git에 올리지 않음** (`.gitignore` 처리됨)  
3. **키 백업** — 분실 시 동일 패키지로 업데이트 불가

---

## 3. AAB 빌드

```powershell
$env:Path = "C:\proj\flutter\bin;" + $env:Path
cd C:\proj\newslett\magam_app
copy .env.example .env
# .env 에 SUPABASE_URL, SUPABASE_ANON_KEY, MAGAM_SHARE_BASE_URL=https://cleanidex.co.kr

flutter pub get
flutter build appbundle --release --dart-define-from-file=.env
```

산출물: `build/app/outputs/bundle/release/app-release.aab`

`key.properties` 없으면 debug 서명으로 빌드되며 **스토어 업로드 불가**합니다.

---

## 4. Play Console — 앱 등록

| 필드 | 권장 값 |
|------|---------|
| 앱 이름 | 마감링크 |
| 패키지 | `com.cleanidex.magam_app` (변경 불가) |
| 카테고리 | 비즈니스 또는 도구 |
| Privacy policy URL | `https://cleanidex.co.kr/privacy` |
| **고객지원 URL** | `https://cleanidex.co.kr/magam/support` |

### 스토어 문구 (초안)

**짧은 설명 (80자)**

```
구인·도급 공고를 링크로 공유하고, 마감하면 연락처가 자동으로 비공개됩니다.
```

**긴 설명** — 태그라인, 글쓰기, 링크 공유, 마감, 설정(연락처·탈퇴) 순으로 작성.

### 그래픽 (직접 제작 필요)

| 자산 | 규격 |
|------|------|
| 앱 아이콘 | 512×512 PNG |
| 스크린샷 | 휴대폰 최소 2장 (권장 4~8) |
| Feature graphic | 1024×500 PNG |

현재 앱 아이콘은 Flutter 기본값 → **브랜드 아이콘 교체 권장**.

---

## 5. App content 선언 (Console)

| 선언 | 마감링크 답변 요약 |
|------|-------------------|
| **Data safety** | 이메일, 소셜 ID, 전화번호, 공고 텍스트 수집 · HTTPS 전송 · Supabase 저장 |
| **광고** | 앱에 광고 포함 (입주레이더 지역/전국 배너) |
| **UGC** | 사용자가 공고 등록 · 이용약관 동의 · `/magam/support` 신고 경로 |
| **Target audience** | 성인 (구인·도급) — 13세 미만 아님 |
| **Content rating** | IARC 설문 (폭력·성적 콘텐츠 없음으로 답하되 설문에 맞게) |
| **Sign-in for reviewers** | 테스트용 **이메일+비밀번호** 계정 제공 (카카오만 있으면 심사 지연) |

### Data safety 상세 (초안)

- **수집:** 이름(카카오), 이메일, 전화번호, 사용자 콘텐츠(공고)  
- **목적:** 계정, 앱 기능, 광고 성과 집계  
- **공유:** 마감 전 공유 링크 방문자에게 연락처 표시 (앱 기능)  
- **삭제:** 설정 → 회원 탈퇴  
- **암호화:** 전송 중 암호화 ✅

---

## 6. 클로즈드 테스트 (신규 개인 계정)

1. Play Console → Testing → Closed testing → 테스터 12명 초대  
2. **14일 연속** opt-in 유지, 테스터가 앱 **실행**  
3. 국가 타깃은 **전체** 권장 (테스터 지역 불일치 방지)  
4. 14일 후 Production access 신청

---

## 7. 심사용 테스트 계정

Console → App content → **App access** 에 기재:

```
이메일: reviewer+magam@yourdomain.com
비밀번호: (임시 비밀번호)
```

- 로그인 → 글쓰기 → 등록 → 상세에서 링크 복사·마감 동작 확인 가능한 상태  
- 카카오만 쓰는 계정은 심사관이 테스트하기 어렵습니다.

---

## 8. Supabase·카카오 (프로덕션)

Dashboard → Auth → URL Configuration:

- `https://cleanidex.co.kr/auth/callback`
- `io.supabase.magamapp://login-callback/`

카카오 개발자 콘솔 Redirect URI에도 Android 콜백 등록.

---

## 9. 출시 전 최종 점검

- [ ] `key.properties` + AAB 릴리스 빌드 성공  
- [ ] cleanidex.co.kr 배포 (탈퇴 API, `/magam/support`)  
- [ ] `MAGAM_SUPPORT_EMAIL` 실제 수신 확인  
- [ ] 심사용 계정으로 로그인·글쓰기·마감·탈퇴(스테이징 계정) 테스트  
- [ ] 스크린샷·아이콘·feature graphic 업로드  
- [ ] Data safety / 광고 / UGC 선언 완료  
- [ ] (개인 계정) 클로즈드 14일 완료  

---

## 10. 아직 코드 밖에서 할 일

| 항목 | 비고 |
|------|------|
| 브랜드 앱 아이콘·스플래시 | `flutter_launcher_icons` 등 |
| 스토어 스크린샷 촬영 | 에뮬레이터 또는 실기기 |
| Play Console 그래픽·문구 최종 검수 | |
| 개발자 연락처·D-U-N-S (조직 계정 시) | |

---

## 관련 파일

- `android/key.properties.example` — 서명 설정 예시  
- `lib/services/magam_account_service.dart` — 탈퇴 클라이언트  
- `app/api/magam/delete-account/route.ts` — 탈퇴 API  
- `app/magam/support/page.tsx` — 고객지원 URL
