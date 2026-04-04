# Vercel Cron 설정 요약

## 1. 현재 프로젝트 상태

- 루트 **`vercel.json`** 에 **G2B 수집**·**일간 입찰 리포트**·**네이버 데이터랩 트렌드** Cron이 정의되어 있습니다. 배포 시 Vercel에 스케줄이 반영됩니다.
- **Hobby(무료)** 는 “하루 1회”만 허용되므로, 아래처럼 **하루 여러 번**인 `fetch-g2b` 등은 **Pro 이상**이 필요합니다.

### 일간 리포트 `/api/cron/generate-content` (기본 `type=daily`)

- **스케줄**: UTC `59 14 * * *` (= **KST 23:59**). 호출은 매일이나, **토·일(KST)이면 `skipped: true`** 로 생성·발행하지 않습니다.
- **동작**: `buildDailyTenderReport` + **`autoPublish: true`** → `posts.published_at` 설정(자동 공개). 이미 당일 성공한 run이 있으면 `already_success`로 스킵(`force` 없을 때).
- **인증**: `GET`/`POST` 모두 `verifyCronSecret`(Bearer 또는 `x-cron-secret`).

### 네이버 데이터랩 `/api/cron/naver-trend-report`

- **스케줄**: UTC `0 18 * * *` → **한국 시간 매일 03:00** (KST = UTC+9).
- **데이터**: `runNaverTrendReportJob`이 **KST 기준 “오늘”**으로 `getKstTodayString()`을 쓰고, **어제**를 `endDate`로 두어 전일까지 30일 윈도우를 조회합니다.
- **인증**: `GET`/`POST` + `verifyCronSecret`. Vercel Cron은 Bearer.
- **환경 변수**: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 필요.

### G2B 수집 `/api/cron/fetch-g2b` (저장소 기준)

- **한국 시간(Asia/Seoul)**: 평일 **07:00, 11:00, 15:00, 19:00, 23:00** (약 4시간 간격).
- **주말(토·일) 및 평일 0~6시**: Vercel이 호출해도 API가 **`skipped: true`** 로 즉시 응답하고 수집은 하지 않습니다.
- **조회 구간**: 각 실행마다 KST 기준 **최근 4시간 10분** (`G2B_CRON_LOOKBACK_MINUTES`).

Vercel Cron 표현식은 **UTC**만 받습니다. 위 KST 시각에 맞춘 UTC는 다음과 같습니다 (KST = UTC+9).

| KST (평일) | UTC (cron `분 시`) |
|------------|-------------------|
| 07:00 | 전날 22:00 → `0 22 * * *` |
| 11:00 | 당일 02:00 → `0 2 * * *` |
| 15:00 | 당일 06:00 → `0 6 * * *` |
| 19:00 | 당일 10:00 → `0 10 * * *` |
| 23:00 | 당일 14:00 → `0 14 * * *` |

### CRON_SECRET 설정 (필수)

Vercel이 Cron으로 라우트를 호출할 때 **`Authorization: Bearer <CRON_SECRET>`** 헤더를 붙이려면, 프로젝트에 **`CRON_SECRET` 환경 변수**가 있어야 합니다.

1. [Vercel](https://vercel.com) → 해당 **프로젝트** → **Settings** → **Environment Variables**.
2. **Name**: `CRON_SECRET`  
   **Value**: 충분히 긴 임의 문자열(예: `openssl rand -hex 32` 결과).  
   **Environment**: Production(및 Preview/Development에서 Cron·로컬 테스트가 필요하면 해당 환경에도 동일 또는 별도 값).
3. **Save** 후 **재배포**하면 Cron 요청에 Bearer가 포함됩니다.

로컬·수동 호출:

- **POST** `x-cron-secret: <값>` 또는 `Authorization: Bearer <값>`
- **GET** (Vercel Cron과 동일): `Authorization: Bearer <값>`

`.env.local` 예:

```env
CRON_SECRET=여기에_긴_임의_문자열
```

### 기타 Cron API (호출만 하면 동작)

| 경로 | 용도 | 권장 주기 (설계) |
|------|------|------------------|
| `GET/POST /api/cron/fetch-g2b` | G2B 입찰 수집 | `vercel.json` 참고 (Pro) |
| `GET/POST /api/cron/generate-content` | 일간 입찰 리포트 생성·자동 발행 | `59 14 * * *` (UTC) ≈ KST 23:59, 주말 스킵 |
| `GET/POST /api/cron/naver-trend-report` | 네이버 데이터랩 일일 리포트 | `0 18 * * *` (UTC) = KST 03:00 |
| `POST /api/cron/close-expired-job-posts` | work_date 지난 구인글 마감 처리 | 매일 1회 |
| `POST /api/cron/cleanup-closed-tenders` | 마감 3개월 지난 입찰 정리 | 매일 1회 |
| `GET /api/cron/process-subscriptions` | Bootpay 구독 결제 갱신 | 매일 1회 |
| `POST /api/cron/daily-digest` | (deprecated) | 사용 안 함 → generate-content 사용 |
| `POST /api/cron/backfill-clean-score` | clean_score 백필 | 수동/필요 시 |

`generate-content` 등은 `x-cron-secret` 또는 프로젝트에서 통일한 방식으로 검증합니다. `process-subscriptions`는 `Authorization: Bearer CRON_SECRET`을 사용합니다.

---

## 2. Vercel 플랜별 Cron 제한 (공식 문서 기준)

| 항목 | Hobby (무료) | Pro |
|------|----------------|-----|
| 프로젝트당 cron 개수 | 100개 | 100개 |
| **최소 실행 간격** | **하루 1회만** | 1분마다 가능 |
| **실행 시각 정확도** | **1시간 범위(±59분)** | 분 단위 |

### Hobby(무료) 제한 요약

- **“하루 1회”만 가능**  
  - `0 6 * * *` (매일 06:00) → ✅ 가능  
  - `0 * * * *` (매시간) → ❌ 배포 시 에러  
  - `*/30 * * * *` (30분마다) → ❌ 배포 시 에러  

---

## 3. 설정 방법 (둘 중 하나)

### A. Vercel Dashboard에서 수동 등록

`vercel.json`과 **중복되지 않게** 기존 Cron을 정리한 뒤 등록합니다.

### B. 저장소의 `vercel.json` (fetch-g2b)

프로젝트 루트 `vercel.json`의 `crons` 배열이 배포 시 적용됩니다. 다른 작업용 Cron을 추가할 때는 [Usage & Pricing for Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing)를 확인하세요.

---

## 4. 확인 체크리스트

- [ ] **CRON_SECRET** 이 Vercel(및 로컬 `.env.local`)에 설정되어 있는지  
- [ ] **DATA_GO_KR_SERVICE_KEY**, **SUPABASE_SERVICE_ROLE_KEY** 등 필요한 변수가 있는지  
- [ ] 플랜이 **Pro** 인지 (fetch-g2b는 하루 5회 × 평일 트리거 구조)  
- [ ] 대시보드에 **동일 경로 Cron이 이중**으로 없는지  

이 문서는 현재 코드/설계 기준이며, Vercel 제한은 공식 문서를 최종 참고하면 됩니다.
