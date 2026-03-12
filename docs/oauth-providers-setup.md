# 구글 / 카카오 로그인 설정 (Supabase Auth)

앱에서는 이미 구글·카카오·네이버 로그인 버튼과 콜백(`/auth/callback`)이 구현되어 있습니다.  
아래는 **Supabase 대시보드**와 **각 플랫폼 개발자 콘솔**에서 해야 할 설정입니다.

---

## 1. Supabase 공통 설정

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택 → **Authentication**
2. **URL Configuration** (또는 Providers 위쪽):
   - **Site URL**: 운영 기준이면 `https://cleanidex.co.kr` 로 설정  
     (여기가 `http://localhost:3001` 이면 로그인 후 **localhost로 돌아가는** 원인임)
   - **Redirect URLs**에 다음을 모두 추가:
     - `https://cleanidex.co.kr/auth/callback`
     - `https://www.cleanidex.co.kr/auth/callback`
     - 로컬 개발용: `http://localhost:3000/auth/callback` (또는 `http://localhost:3001/...`)
3. **Providers**에서 Google / Kakao 각각 활성화 및 키 입력

---

## 2. Google 로그인

### 2-1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 또는 새로 생성
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. **Authorized redirect URIs**에 Supabase가 안내하는 URL 추가:
   - Supabase **Authentication** → **Providers** → **Google** 에서 "Callback URL (for OAuth)" 복사
   - 예: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
   - 이 URL을 Google에 그대로 등록
6. **Create** 후 **Client ID**, **Client Secret** 복사

### 2-2. Supabase에 등록

1. Supabase **Authentication** → **Providers** → **Google** 활성화
2. **Client ID**, **Client Secret** 붙여넣기 → **Save**

---

## 3. Kakao 로그인

### 3-1. Kakao Developers (카카오 개발자 콘솔)

1. **[Kakao Developers](https://developers.kakao.com/)** 로그인 → **내 애플리케이션**
2. **애플리케이션 추가** 또는 기존 앱 선택
3. **앱 키** 탭에서 **REST API 키** 복사 (Supabase Client ID에 넣을 값)
4. **제품 설정** → **카카오 로그인** → **활성화 설정** **ON**
5. **카카오 로그인** → **Redirect URI**:
   - **Redirect URI 등록** 클릭
   - Supabase **Authentication** → **Providers** → **Kakao** 에서 표시되는 **Callback URL** 복사  
     (예: `https://yrrhqdcvfbjdmjqfssnr.supabase.co/auth/v1/callback`)
   - Kakao에 **그대로 한 줄** 추가 후 저장
6. **동의 항목**: 닉네임, 프로필 사진, 이메일 등 필요 시 **수집 동의** 설정
7. **보안** 탭(선택):
   - **Client Secret** 사용 시 **코드** 방식 활성화 후 시크릿 생성
   - Supabase Kakao Provider에 **Client Secret** 칸이 있으면 여기서 생성한 값 입력 (없으면 비워둬도 됨)

### 3-2. Supabase에 등록

1. Supabase **Authentication** → **Providers** → **Kakao** 켜기
2. **Client ID (REST API 키)**: Kakao **앱 키** 탭의 **REST API 키** 붙여넣기
3. **Client Secret**: Kakao **보안**에서 생성한 값이 있으면 입력, 없으면 비움
4. **Save**

### 카카오 로그인 체크리스트

| 확인 항목 | 위치 |
|----------|------|
| 카카오 로그인 **활성화** ON | Kakao 제품 설정 → 카카오 로그인 |
| **Redirect URI** = Supabase Callback URL과 **완전 일치** | Kakao 카카오 로그인 → Redirect URI |
| Supabase **Redirect URLs**에 운영 주소 포함 | Supabase Auth → URL Configuration |
| **Site URL**이 로컬이면 로그인 후 localhost로 감 | Supabase Auth → URL Configuration (아래 참고) |

---

## 4. 네이버 로그인 (선택)

1. [Naver Developers](https://developers.naver.com/) → **Application** 등록
2. **API 설정** → **Callback URL**에 Supabase Callback URL 등록
3. **Client ID**, **Client Secret**을 Supabase **Providers** → **Naver**에 입력

---

## 5. 로그인 후 동작

- 로그인 성공 시 `/auth/callback`에서 세션 생성 후 `next` 파라미터 또는 기본값 `/onboarding`으로 이동
- 최초 소셜 로그인 사용자는 `profiles` 등에 자동 생성되도록 Supabase Auth Hook 또는 기존 로직 확인 필요

---

## 6. 로그인 후 localhost로 리다이렉트될 때

- **원인**: Supabase **Site URL**이 `http://localhost:3000` 등으로 되어 있으면, 콜백 후 그 주소로 보냄.
- **조치**: **Authentication** → **URL Configuration** → **Site URL**을 `https://cleanidex.co.kr` 로 바꾸고, **Redirect URLs**에는 운영/로컬 주소를 **둘 다** 넣어 두면, 접속한 도메인(cleanidex.co.kr vs localhost)에 맞게 리다이렉트됨.

---

## 7. 환경 변수

구글/카카오/네이버 키는 **Supabase Dashboard → Authentication → Providers**에서만 설정하면 됩니다.  
Next.js 쪽 `.env`에는 Supabase URL/Anon Key만 있으면 됩니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
```
