# Vercel 환경 변수 설정 가이드

배포된 사이트와 Cron/결제 등이 정상 동작하려면 Vercel 프로젝트에 아래 환경 변수를 넣어야 합니다.

---

## 1. 어디에 넣는지

1. [Vercel 대시보드](https://vercel.com) → 해당 프로젝트 선택  
2. **Settings** → **Environment Variables**  
3. **Key** / **Value** 입력 후 **Save**  
4. **Environment**: Production(필수), Preview·Development는 필요 시 동일하게 추가  
5. 변수 추가·수정 후 **재배포**(Deployments → ⋮ → Redeploy) 해야 반영됩니다.

---

## 2. 필수 (사이트 기본 동작)

| Key | 설명 | 예시/확인 방법 |
|-----|------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon(공개) 키 | 긴 문자열 |

**확인**: [Supabase 대시보드](https://supabase.com/dashboard) → 프로젝트 → **Settings** → **API**  
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`  
- Project API keys → **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**주의**: `NEXT_PUBLIC_` 로 시작하는 값은 브라우저에 노출되므로, 비밀키는 여기 넣지 마세요.

---

## 3. 서버 전용 (Cron·자동 생성·관리자 등)

| Key | 설명 | 필수 시점 |
|-----|------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 키 | Cron으로 자동 콘텐츠 생성·posts insert 시 **필수**. 없으면 generate-content 등 500 |
| `CRON_SECRET` | Cron API 호출 시 사용할 비밀값 | Cron 사용 시 **권장**. 설정하면 `x-cron-secret` 헤더에 이 값을 넣어야 200 응답 |

**SUPABASE_SERVICE_ROLE_KEY**  
- Supabase → Settings → API → **service_role** (secret)  
- **절대** `NEXT_PUBLIC_` 붙이지 말 것. 서버에서만 사용.

**CRON_SECRET**  
- 본인이 정한 랜덤 문자열(예: `openssl rand -hex 24` 결과)  
- Vercel Cron 또는 외부 Cron에서 `POST /api/cron/...` 호출 시  
  요청 헤더: `x-cron-secret: (CRON_SECRET 값)`

---

## 4. 선택 (기능별)

### 나라장터(G2B) 입찰 수집

| Key | 설명 |
|-----|------|
| `DATA_GO_KR_SERVICE_KEY` | 공공데이터포털에서 발급한 나라장터 입찰공고 API 인증키(Encoding) |

- 없으면: 입찰 수집 Cron·상세 보강 API는 동작하지 않음.  
- 있으면: `POST /api/cron/fetch-g2b` 로 입찰 수집 가능.  
- 발급: [공공데이터포털 - 조달청 나라장터 입찰공고정보서비스](https://www.data.go.kr/data/15129394/openapi.do) 활용신청 후 인증키 발급.

---

### 자동 콘텐츠 발행 모드

| Key | 설명 |
|-----|------|
| `CONTENT_AUTO_PUBLISH` | `true` 이면 자동 생성 글 즉시 공개, 없거나 `false` 이면 검수(미발행) 후 관리자가 발행 |

---

### Bootpay 결제(구독)

| Key | 설명 |
|-----|------|
| `BOOTPAY_APPLICATION_ID` | Bootpay 앱 ID (서버 검증용) |
| `BOOTPAY_PRIVATE_KEY` | Bootpay Private Key (서버 전용, 노출 금지) |
| `BOOTPAY_MODE` | `development` / `stage` / `production` (기본: production) |
| `NEXT_PUBLIC_BOOTPAY_APPLICATION_ID` | Bootpay 앱 ID (클라이언트 결제창용, NEXT_PUBLIC_ 필수) |

- 구독/결제 기능 쓸 때만 필요.  
- Bootpay 개발자센터에서 앱 생성 후 발급.

---

### 기타

| Key | 설명 |
|-----|------|
| `NEXT_PUBLIC_KAKAO_CHAT_URL` | 카카오 채널/톡 상담 링크 (견적 계산기 등에서 사용, 없으면 "#") |

---

## 5. 한 번에 복사용 체크리스트

**최소 (배포된 사이트가 DB·로그인 쓰려면)**  
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Cron·자동 콘텐츠까지 쓸 때**  
```
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

**입찰 수집까지 쓸 때**  
```
DATA_GO_KR_SERVICE_KEY
```

**자동 생성 글 즉시 공개**  
```
CONTENT_AUTO_PUBLISH=true
```

**Bootpay 결제 쓸 때**  
```
BOOTPAY_APPLICATION_ID
BOOTPAY_PRIVATE_KEY
NEXT_PUBLIC_BOOTPAY_APPLICATION_ID
```

---

## 6. 보안 주의

- **NEXT_PUBLIC_** 가 붙은 것만 브라우저에 노출됩니다.  
- `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `BOOTPAY_PRIVATE_KEY`, `DATA_GO_KR_SERVICE_KEY` 등은 **절대** `NEXT_PUBLIC_` 로 넣지 마세요.  
- Vercel에서는 Environment Variables에 넣으면 빌드/런타임에만 주입되고, 저장소 코드에는 넣지 마세요.
