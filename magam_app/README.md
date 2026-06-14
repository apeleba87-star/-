# 마감 앱 (Flutter)

도급·구인·매매 공고를 올리고, **링크 공유** 후 **한 번에 마감**하는 Android 앱입니다.  
백엔드는 Cleanidex와 **같은 Supabase** 프로젝트를 사용합니다.

## 사전 준비 (당신이 할 일)

1. **Supabase SQL** — repo 루트에서 `supabase/migrations/171_magam_listings.sql` 을 Dashboard SQL Editor에 실행
2. **Auth** — Dashboard → Authentication  
   - Providers → **Email** 활성화 (이메일+비밀번호 — 클린아이덱스 웹과 동일)  
   - Providers → **Kakao** (웹과 동일 설정)  
   - **URL Configuration** → Redirect URLs 추가:  
     - 웹(고정 포트 권장): `http://localhost:54222/`  
     - 또는 와일드카드: `http://localhost:**`  
     - Android: `io.supabase.magamapp://login-callback/`  
   - 카카오 개발자 콘솔 Redirect URI에도 Android 콜백 URL 등록 (웹 cleanidex URL과 별도)
3. **`.env`** — 이 폴더에 `.env.example` 을 복사해 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 입력  
   - `MAGAM_SHARE_BASE_URL` = Next.js 공유 페이지 주소 (예: `https://cleanidex.com`)

## Flutter 설치 (Windows)

이 PC에는 `C:\proj\flutter` 에 SDK가 clone 되어 있습니다. PATH에 추가:

```powershell
$env:Path = "C:\proj\flutter\bin;" + $env:Path
flutter doctor
```

Android Studio + SDK 없으면 `flutter doctor` 안내에 따라 설치하세요.

## 실행

### 웹 (Chrome) — **포트 고정 권장**

매번 `flutter run` 하면 localhost 포트가 바뀝니다. 카카오 OAuth·Supabase Redirect URL 은 **주소가 고정**되어야 합니다.

1. Supabase Redirect URLs 에 **`http://localhost:54222/`** 한 번만 등록  
2. `.env` 에 `MAGAM_OAUTH_REDIRECT_URL=http://localhost:54222/`  
3. 아래 중 하나로 실행:

```powershell
cd magam_app
.\run_web.bat
```

(PowerShell에서 `.ps1` 정책 오류가 나면 `.bat` 사용. 또는 `powershell -ExecutionPolicy Bypass -File .\run_web.ps1`)

또는:

```powershell
flutter run -d chrome --web-hostname=localhost --web-port=54222
```

→ 항상 **http://localhost:54222** 로 열립니다.

### Android / 기타

```powershell
cd magam_app
copy .env.example .env
# .env 편집 후
flutter pub get
flutter run -d android
```

또는 dart-define:

```powershell
flutter run --dart-define-from-file=.env
```

## 기능 (MVP)

- **클린아이덱스와 동일 로그인**: 카카오 OAuth, 이메일+비밀번호
- 회원가입 → 웹 `/signup` (같은 Supabase 계정)
- 글쓰기 (도급/구인/매매, 서울 25구)
- 내 글 목록 · **마감** · 링크 복사/공유
- 공유 URL → 웹 `/p/[slug]` (카톡용)

## 웹 연동

| 경로 | 설명 |
|------|------|
| `/p/[slug]` | 공유 페이지 (마감 시 연락처 숨김 + 아래 모집 중) |
| `/magam/live` | 실시간 모집 목록 (클린아이덱스) |

## 다음 단계

- Phone OTP 로그인
- Play Store 배포
- 푸시 (FCM)
