# 마감링크 — 웹앱 · PWA 배포

APK 없이 **브라우저·홈 화면 추가**로 바로 쓸 수 있습니다.

**배포 URL:** `https://cleanidex.co.kr/magam/app/`

---

## 지금 당장 로컬 테스트

### 1) 개발 모드 (핫 리로드)

```powershell
cd magam_app
.\run_web.ps1
```

→ `http://localhost:54222/`

Supabase Redirect URLs: `http://localhost:54222/`

### 2) 프로덕션과 동일 경로 (`/magam/app/`)

```powershell
cd magam_app
.\build_web_release.bat
```

또는 repo 루트에서:

```powershell
node scripts/build-magam-pwa.mjs
```

그다음 Next.js 실행:

```powershell
cd ..
npm run dev
```

→ `http://localhost:3001/magam/app/`

---

## 사용자에게 배포하기

1. `magam_app/.env` — Supabase 키 + `MAGAM_SHARE_BASE_URL=https://cleanidex.co.kr`
2. `node scripts/build-magam-pwa.mjs` (또는 `build_web_release.bat`)
3. `public/magam/app/` 이 생성됨 → **git commit & push**
4. Vercel 배포 후 공유:

```
https://cleanidex.co.kr/magam/app/
```

### 홈 화면에 추가 (PWA)

- **Android Chrome:** 메뉴 → 「앱 설치」 또는 「홈 화면에 추가」
- **iPhone Safari:** 공유 → 「홈 화면에 추가」

`manifest.json` + 서비스 워커로 standalone 앱처럼 실행됩니다.

---

## Supabase · 카카오 설정 (프로덕션)

**Auth → Redirect URLs** 에 추가:

```
https://cleanidex.co.kr/magam/app/
http://localhost:54222/
io.supabase.magamapp://login-callback/
```

카카오 개발자 콘솔 Redirect URI에도 `https://cleanidex.co.kr/magam/app/` 등록.

웹 PWA는 배포 도메인을 자동 감지해 OAuth 콜백을 맞춥니다 (`auth_redirect.dart`).

---

## 아이콘

원본: `assets/icon/app_icon.png`

재생성:

```powershell
cd magam_app
dart run flutter_launcher_icons
```

Android / 웹 favicon·PWA 아이콘에 반영됩니다.

---

## APK vs PWA

| | PWA (지금) | APK (나중) |
|--|-----------|------------|
| 배포 | URL 공유 즉시 | Play Store 심사 |
| 업데이트 | 배포만 하면 전원 반영 | 스토어 재심사 |
| 카카오 로그인 | 브라우저 OAuth | 앱 딥링크 |
| 테스트 | **지금 가능** | 클로즈드 14일 등 |

Play Store 준비는 [PLAY_STORE.md](./PLAY_STORE.md) 참고.
