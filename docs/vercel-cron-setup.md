# Vercel Cron 설정 요약

## 1. 현재 프로젝트 상태

- **`vercel.json` 없음** → 저장소에는 cron 스케줄 정의가 없습니다.
- Vercel에 배포해도 **어떤 cron도 자동으로 등록되지 않습니다** (Dashboard에서 수동 추가 필요).

### 있는 Cron API 엔드포인트 (호출만 하면 동작)

| 경로 | 용도 | 권장 주기 (설계) |
|------|------|------------------|
| `POST /api/cron/fetch-g2b` | G2B 입찰 수집 | 매일 1회 (무료) 또는 30분~1시간마다 (Pro) |
| `POST /api/cron/generate-content?type=daily` | 일간 입찰 리포트 자동 생성 | 매일 1회 |
| `POST /api/cron/close-expired-job-posts` | work_date 지난 구인글 마감 처리 | 매일 1회 |
| `POST /api/cron/cleanup-closed-tenders` | 마감 3개월 지난 입찰 정리 | 매일 1회 |
| `GET /api/cron/process-subscriptions` | Bootpay 구독 결제 갱신 | 매일 1회 |
| `POST /api/cron/daily-digest` | (deprecated) queue에 제목만 삽입 | 사용 안 함 → generate-content 사용 |
| `POST /api/cron/backfill-clean-score` | clean_score 백필 | 수동/필요 시 |

호출 시 **헤더**: `x-cron-secret: (CRON_SECRET 환경 변수 값)`  
(process-subscriptions는 `Authorization: Bearer CRON_SECRET`)

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
- **시각 보장 없음**  
  - 예: “매일 06:10”으로 설정해도 **06:10~07:09 사이 아무 때나** 한 번 실행될 수 있음.

즉, **무료 플랜에서는 “매일 1번씩” 돌리는 cron만** 설정할 수 있고,  
README에 적힌 “30분~1시간마다 fetch-g2b”는 **Pro 이상**에서만 가능합니다.

---

## 3. 무료 플랜에서 쓰기 좋은 설정

- **fetch-g2b**: 하루 1회 (예: 새벽 6시대)  
- **generate-content?type=daily**: 하루 1회 (fetch-g2b보다 뒤, 예: 6시대 또는 7시대)  
- **close-expired-job-posts**: 하루 1회  
- **cleanup-closed-tenders**: 하루 1회 (또는 주 1회 등)  
- **process-subscriptions**: 하루 1회 (결제 갱신일 맞춰서)

같은 엔드포인트를 “하루에 한 번만” 호출하면 Hobby 제한에 맞습니다.

---

## 4. 설정 방법 (둘 중 하나)

### A. Vercel Dashboard에서 수동 등록

1. Vercel 프로젝트 → **Settings** → **Cron Jobs** (또는 배포 메뉴에서 Cron Jobs).
2. **Create Cron Job**으로 다음처럼 추가 (예시).
   - Path: `/api/cron/fetch-g2b`  
     Schedule: `0 6 * * *` (매일 06:00, UTC 기준이면 한국 15:00)  
   - Path: `/api/cron/generate-content?type=daily`  
     Schedule: `30 6 * * *` (매일 06:30 UTC → 한국 15:30)
3. **CRON_SECRET**, **SUPABASE_SERVICE_ROLE_KEY** 등은 프로젝트 **Environment Variables**에 반드시 설정.

(실제 시각은 Vercel이 UTC인지 KST인지 문서 확인 후 조정.)

### B. 저장소에 `vercel.json` 추가 후 배포

프로젝트 루트에 `vercel.json`을 두면, 배포 시 같은 스케줄이 프로젝트에 적용됩니다.  
**Hobby에서는 반드시 “하루 1회” 표현만** 사용해야 합니다.

예시 (모두 매일 1회):

```json
{
  "crons": [
    { "path": "/api/cron/fetch-g2b", "schedule": "0 6 * * *" },
    { "path": "/api/cron/generate-content", "schedule": "30 6 * * *" },
    { "path": "/api/cron/close-expired-job-posts", "schedule": "0 7 * * *" }
  ]
}
```

- `type=daily`는 쿼리로 넘기므로, Vercel cron에서는 path를 `/api/cron/generate-content`로 두고,  
  실제 호출 시 `GET/POST`에 `?type=daily`가 붙도록 Vercel이 호출하는지 확인이 필요합니다.  
  (Vercel Cron이 쿼리 스트링을 그대로 붙여 주는지 문서 확인 후, 필요하면 path를 `/api/cron/generate-content?type=daily`로 넣거나, 앱에서 path만 받고 type 기본값을 daily로 두는 방식으로 조정.)

---

## 5. 확인 체크리스트 (무료 플랜)

- [ ] Vercel 프로젝트에 **CRON_SECRET**, **SUPABASE_SERVICE_ROLE_KEY** 등 필요한 환경 변수 설정했는지
- [ ] Cron 표현식이 **매일 1회**인지 (Hobby는 더 짧은 주기 불가)
- [ ] 원하는 실행 시각이 **UTC 기준**인지 **KST 기준**인지 확인 후 schedule 값 조정
- [ ] (선택) `vercel.json`으로 관리할지, Dashboard에서만 등록할지 결정

이 문서는 현재 코드/설계 기준이며, Vercel 제한은 [Usage & Pricing for Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing)를 최종 참고하면 됩니다.
