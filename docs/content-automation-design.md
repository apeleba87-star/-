# 클린아이덱스 콘텐츠 자동화 시스템 설계

**목표**: 사람이 쓰지 않아도 매일/매주/매월 자동 기사가 발행되고, 청소용품·장비·이슈 관련 글만 수동으로 올리는 구조.

**운영 원칙**: 서버비용 최소화 · 서비스 속도 최대화 · 콘텐츠 품질 최상 · 다수 사용자 공개 가능 수준.

---

## 0. 발행 모드 스위치 (생성 vs 발행 분리)

자동으로 **생성**된 글을 곧바로 공개할지, 관리자 **검수 후 발행**할지 선택할 수 있게 한다.

| 모드 | 설명 | posts 저장 시 | 공개 시점 |
|------|------|----------------|-----------|
| **자동 발행** | 품질 검증 통과 시 즉시 공개 | `published_at = now()` | 생성 직후 |
| **검수/수동 발행** | 초안만 저장, 관리자 확인 후 발행 | `published_at = null` | 관리자가 “발행” 처리 시 |

- **스위치 저장**: 1차는 환경변수 `CONTENT_AUTO_PUBLISH=true|false` (기본 `false` = 검수 모드). 2차에서 관리자 설정 테이블 + Admin UI 스위치로 전환 가능.
- **품질 검증**: 두 모드 모두 **발행 전 검증 규칙** 적용. 검수 모드라도 검증 실패 시 run = failed, post 미생성.
- **안정화 후**: 초기엔 검수 모드로 운영하다가, 품질·안정성 확인 후 자동 발행으로 전환 권장.

---

## 1. 현재 시스템과의 정합성

### 1.1 이미 있는 것

| 항목 | 현재 구조 | 자동화에서의 활용 |
|------|-----------|-------------------|
| **posts** | category_id, title, slug, body, excerpt, newsletter_include, published_at | 자동 기사도 여기에 저장. `source_type`/`source_ref`로 구분. |
| **content_categories** | chemical(약품), equipment(장비), labor(근로), industry(업계이슈) | **수동 글** = 이 카테고리만 사용. 자동 글은 category_id NULL 또는 별도 "입찰 브리핑" 카테고리. |
| **newsletter_queue** | type(auto/manual/ugc), ref_type, ref_id, title, summary, content_html, scheduled_for | 자동 기사 생성 후 여기에 적재 → 뉴스레터에 포함. |
| **tenders** | bid_ntce_dt, bid_clse_dt, base_amt, bsns_dstr_nm, ntce_instt_nm, bid_ntce_nm | 일간/주간/월간 **입찰 리포트**의 데이터 소스. |
| **market_benchmarks** | region, category, pay_unit, average_pay 등 | 추후 "청소 시장 데이터" 기사용. |
| **listing_benchmarks** | fee/monthly/deal/multiplier, 지역·유형별 | 추후 "현장 거래 시장" 기사용. |
| **cron** | fetch-g2b, daily-digest(현재는 queue에 제목만 insert) | daily-digest를 **전면 개편** 또는 **generate-content** 신설 후 daily-digest는 deprecated. |

### 1.2 수동 vs 자동 구분

| 구분 | 주기 | 데이터 소스 | 저장 위치 | 비고 |
|------|------|-------------|-----------|------|
| **수동** | 사용자 작성 시 | 사람 입력 | posts (category_id = chemical/equipment/labor/industry) | 청소용품·장비·이슈·근로. source_type = null 또는 'manual'. |
| **자동 일간** | 매일 1회 | tenders (당일 bid_ntce_dt 기준) | posts (source_type = auto_tender_daily) | "오늘 청소 입찰 N건". |
| **자동 주간** | 주 1회 | tenders (최근 7일) | posts (source_type = auto_tender_weekly) | "이번주 청소 입찰 분석". |
| **자동 월간** | 월 1회 | tenders (해당 월) | posts (source_type = auto_tender_monthly) | "N월 청소 입찰 시장 리포트". |
| **(추후) 자동 시장 데이터** | 주/월 | market_benchmarks, listing_benchmarks | posts (source_type = auto_market 등) | "서울 청소 일당 평균" 등. |

**정리**: 수동 = content_categories 4종(약품/장비/근로/업계이슈). 자동 = 입찰/시장 데이터 기반, source_type으로 구분.

---

## 2. DB 추가 사항

### 2.1 content_generation_runs (신규)

자동 생성 실행 이력·중복 방지·실패 로그용.

```sql
CREATE TABLE IF NOT EXISTS public.content_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL,  -- 'daily_tender_digest' | 'weekly_tender_report' | 'monthly_tender_report'
  run_key TEXT NOT NULL,   -- '2026-03-11' | '2026-W11' | '2026-03'
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | success | failed | skipped
  source_count INT,
  generated_post_id UUID REFERENCES posts(id),
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX content_generation_runs_run_type_run_key
  ON content_generation_runs (run_type, run_key);
```

- **중복 방지**: 같은 (run_type, run_key)로 재호출 시 이미 success면 skip.
- **재시도**: failed인 경우 같은 run_key로 다시 호출 가능(선택적으로 idempotent하게 처리).

### 2.2 posts 확장

자동 생성 글 구분 및 중복 방지.

```sql
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_ref TEXT;
-- 선택: SEO용 (자동 글은 템플릿으로 채우기 쉬움)
-- ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS meta_title TEXT;
-- ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS meta_description TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS posts_auto_source_unique
  ON posts (source_type, source_ref)
  WHERE source_type IS NOT NULL AND source_ref IS NOT NULL;
```

- **source_type**: `auto_tender_daily` | `auto_tender_weekly` | `auto_tender_monthly` (추후 `auto_market` 등).
- **source_ref**: `2026-03-11` | `2026-W11` | `2026-03` 등.
- 수동 글은 source_type/source_ref = NULL.
- **slug**: 자동 글은 **제목 기반이 아닌 고정 규칙**. 예: `2026-03-11-daily-tender-digest`, `2026-W11-weekly-tender-report`, `2026-03-monthly-tender-report`. 템플릿 변경·중복·SEO 불안정 방지.

### 2.3 content_categories 확장 (선택)

자동 글용 카테고리 하나 두고 싶다면:

- slug `tender_briefing` / name `입찰 브리핑` 추가 후, 자동 글의 category_id를 여기로 지정.
- 또는 자동 글은 category_id = NULL로 두고, 아카이브/필터에서 source_type으로만 구분해도 됨.

---

## 3. 데이터 → 기사 생성 흐름

```
cron (매일 06:30 등)
  → POST /api/cron/generate-content?type=daily
  → 1) run_key 계산 (KST 기준: getKstDateString 등)
  → 2) content_generation_runs 중복 체크 (이미 success면 200 + skipped)
  → 3) tenders 집계 (KST 일자 범위로 조회)
  → 4) 일간 한정: count_total = 0 → status = skipped, post 생성 안 함
  → 5) 품질 검증 (최소 발행 조건) 통과 시에만 다음 단계
  → 6) 제목/본문 생성 (섹션 함수 조립)
  → 7) slug = 고정 규칙 (예: 2026-03-11-daily-tender-digest)
  → 8) posts insert (source_type, source_ref, published_at = 발행모드에 따라 now 또는 null)
  → 9) newsletter_queue insert (ref_type=post, ref_id만; title/summary만, content_html 비우거나 요약만)
  → 10) content_generation_runs status = success, payload, generated_post_id, finished_at 갱신
```

주간/월간도 동일. type=weekly → run_key = `2026-W11`, type=monthly → run_key = `2026-03`. **발행 모드**가 검수면 `published_at = null`로 저장.

---

## 4. 집계 설계 (tenders 기준)

현재 tenders 컬럼: `bid_ntce_dt`, `bid_clse_dt`, `base_amt`, `estmt_amt`, `bsns_dstr_nm`, `ntce_instt_nm`, `bid_ntce_nm`, `keywords_matched`(배열) 등.

### 4.1 일간 리포트용 집계

- **대상**: `bid_ntce_dt`가 **KST 기준 오늘**인 행.  
  **반드시** `getKstDayRange(date)` 같은 공용 유틸로 KST 00:00~23:59:59를 UTC 구간으로 변환 후 쿼리.  
  (나라장터 수집 시간·Supabase timestamp·서버 타임존이 어긋나면 “오늘 글에 어제 공고”가 섞이므로, run_key·조회 범위를 모두 KST로 통일.)
- **필요 값**:
  - count_total
  - budget_total (base_amt 합계, null 제외)
  - region_breakdown: `bsns_dstr_nm` 또는 `parseRegionSido(bsns_dstr_nm)`로 시·도 그룹 카운트
  - top_budget_tenders: base_amt 상위 5건 (제목, 기관, 예산, 마감일)
  - deadline_soon_tenders: bid_clse_dt가 가까운 순 5건 (마감 임박)
- **키워드 비중**: `keywords_matched` 배열을 풀어서 청소/소독/방역 등 그룹 카운트 (선택).

### 4.2 주간/월간

- 주간: `bid_ntce_dt`가 **KST 기준** 최근 7일 (`getKstWeekRange`).
- 월간: `bid_ntce_dt`가 **KST 기준** 해당 월 (`getKstMonthRange`).
- 동일하게 count_total, budget_total, region_breakdown, 기관 유형(ntce_instt_nm 또는 dmand_instt_nm 패턴), top_budget, 전주/전월 대비 증감(선택).

### 4.3 지역 파싷

- `lib/tender-utils.ts`의 `parseRegionSido(bsns_dstr_nm ?? ntce_instt_nm)` 사용해 시·도 추출 후 집계.
- DB만으로 하려면 tenders에 `region_sido` 컬럼을 두고 G2B 수집 시 또는 배치로 채우는 방법도 있음 (추후).

---

## 5. 기사 템플릿 전략

- **LLM 없이** 규칙 기반 문자열 조합만 사용해 안정성·비용 최소화.
- **제목**: 날짜/건수 기반 1종 또는 2~3종 템플릿 순환.
- **본문**: 한 덩어리 문자열이 아니라 **섹션별 함수로 조립**해 재사용·테스트·부분 교체가 쉽게.
  - `buildSummarySection(payload)` — 요약 문단
  - `buildRegionSection(regionBreakdown)` — 지역별 목록
  - `buildTopBudgetSection(topBudgetTenders)` — 예산 상위 표
  - `buildDeadlineSection(deadlineSoonTenders)` — 마감 임박
  - `buildInsightSection(payload)` — 한줄 해석
  - 최종 본문 = 위 섹션들을 순서대로 이어 붙인 마크다운.

### 5.1 예외 처리

- **일간 0건**: post **생성하지 않음**. `content_generation_runs.status = skipped`, `payload = { count_total: 0 }`만 저장. (아카이브 품질·SEO·체감을 위해 0건 글은 쌓지 않음. 주간/월간은 0건 가능성 낮아 정상 생성.)
- **예산 null**: 합산 제외. 본문에 "일부 공고는 예산 미공개" 문구.
- **지역 없음**: "지역 미상 N건" 또는 생략.

### 5.2 발행 전 품질 검증 (최소 발행 조건)

생성 성공 = “DB insert 성공”이 아니라 **최소 품질 기준 통과 후** insert. 아래를 통과해야만 post 생성·(자동발행 모드일 때) published_at 설정.

- `count_total >= 1`
- `title` 길이 ≥ 10자
- `body` 길이 ≥ 300자
- `topBudget` 1건 이상 (또는 상위 입찰 목록이 전부 null이 아님)
- 생성할 `slug` 존재 (고정 규칙으로 생성하므로 항상 존재)
- 본문에 `null`/`undefined` 문자열이 포함되지 않음
- payload의 `source_count`와 본문에 나오는 건수 일치

**실패 시**: run status = `failed`, error_message에 사유 저장, post 미생성, 500 반환.  
(count_total = 0인 경우는 별도로 **skipped** 처리.)

### 5.4 한줄 해석(insight_sentence) 규칙

- 1위 지역 비중 ≥ 40% → "오늘 공고는 {{top_region}}에 집중되는 흐름을 보였습니다."
- 상위 2개 지역 합 ≥ 60% → "수도권 중심 공고 비중이 높게 나타났습니다."
- 그 외 → "오늘 공고는 특정 지역 편중 없이 비교적 고르게 분포했습니다."
- 상위 1건 예산이 전체의 20% 이상 → "대형 공고 1건이 전체 예산 규모를 크게 끌어올렸습니다."

---

## 6. API 구조

### 6.1 POST /api/cron/generate-content

- **Query**: `type=daily` | `type=weekly` | `type=monthly`. (선택) `force=true` — 기존 success 건 재생성(기존 post 교체·queue 갱신).
- **보안**: `x-cron-secret` 또는 `Authorization: Bearer CRON_SECRET` (기존 cron과 동일).
- **동작**:
  1. run_key 계산 (**KST** 기준: getKstDateString 등).
  2. content_generation_runs에 (run_type, run_key)로 조회. status=success이고 force 아님 → 200 + `{ skipped: true }`.
  3. (일간) count_total = 0 → status=skipped, payload 저장, post 미생성, 200 + `{ skipped: true, reason: 'no_tenders' }`.
  4. pending 또는 없으면 insert (status=pending).
  5. tenders 집계(KST 범위) → payload JSON 생성.
  6. **품질 검증**(content-quality-guard). 실패 시 status=failed, error_message, 500.
  7. 제목/본문 생성(섹션 함수 조립), slug = 고정 규칙.
  8. posts insert: published_at = **발행 모드**(CONTENT_AUTO_PUBLISH)가 true면 now(), 아니면 null.
  9. newsletter_queue insert: ref_type=post, ref_id, title, summary만. content_html은 비우거나 요약만.
  10. content_generation_runs 업데이트: status=success, generated_post_id, payload, finished_at.
- **실패 시**: status=failed, error_message 저장, 500 반환. 같은 run_key로 재호출 가능(재시도).

### 6.2 실행 스케줄 제안

- 매일 **06:10** — /api/cron/fetch-g2b (기존)
- 매일 **06:30** — /api/cron/generate-content?type=daily
- 매주 **월요일 07:00** — /api/cron/generate-content?type=weekly
- 매월 **1일 08:00** — /api/cron/generate-content?type=monthly

G2B 수집이 먼저 끝난 뒤 생성이 돌아가도록 순서 유지.

---

## 7. 뉴스레터 연동 (queue 최소화)

- **newsletter_queue**에는 본문 전체를 넣지 않고 **참조만** 둔다.
- insert 시: `ref_type = 'post'`, `ref_id = post.id`, `title`, `summary`(요약 1~2문장), `content_html`은 비우거나 요약용 짧은 HTML만.  
  → 실제 뉴스레터 발송 시 **해당 post를 다시 조회해 body(마크다운)를 HTML로 렌더링**해 사용.
- 효과: post 수정 시 queue와 불일치 방지, queue 데이터 중복·용량 최소화, 발송 포맷 변경이 한 곳(post 렌더)에서만 가능.
- scheduled_for=당일(또는 해당 주/월의 대표일).
- 발송은 기존 /api/newsletter/send 또는 관리자 “이번 회차 발송” 플로우에서 queue의 ref_id로 post를 읽어 렌더링.

---

## 8. 수동 콘텐츠와의 공존

- **관리자 글쓰기(admin/posts)**: 기존처럼 category_id = chemical/equipment/labor/industry 중 선택. source_type/source_ref 비움.
- **아카이브/목록**:
  - “전체” = 수동 + 자동 모두.
  - “입찰 브리핑” = source_type like 'auto_tender_%'.
  - “약품/장비/근로/업계이슈” = category_id로 필터.
- **SEO/URL**: 자동 글 slug 예시 `2026-03-11-daily-tender-digest` 또는 `2026-03-11-cleaning-tenders`. posts/[id] 또는 /posts/[slug] 기존 라우트 그대로 사용 가능.

---

## 9. 보완점·수정·개선안

### 9.1 일간 집계 기준일 (KST)

- `bid_ntce_dt`가 UTC라면 “오늘”을 KST 기준으로 잘라서 집계해야 함. 서버에서 오늘 KST 00:00~23:59:59 구간을 UTC로 변환 후 쿼리.

### 9.2 tenders 쿼리 성능

- bid_ntce_dt, bid_clse_dt에 인덱스 있음. 일간은 날짜 범위가 좁아 무난.
- 주간/월간은 구간이 넓어지므로, 가능하면 **집계 전용 materialized view**나 **매일 갱신되는 요약 테이블**을 두는 편이 좋음 (2단계에서 검토).

### 9.3 newsletter_queue content_html

- 현재 queue에 content_html이 있음. 자동 기사의 body는 마크다운이므로, 생성 시점에 **마크다운 → HTML** 변환해 content_html에 넣거나, 발송 쪽에서 post.body를 읽어 변환하도록 정책 통일.

### 9.4 slug 중복

- 자동 글은 source_type+source_ref가 unique하므로 slug도 `source_ref + '-daily-tender-digest'` 등으로 고정 시 중복 없음. 수동 글은 기존대로 slug 입력 또는 자동 생성.

### 9.5 0건일 때 처리

- 일간이 0건이어도 “오늘 청소 입찰 0건” 기사는 만들지 않고, content_generation_runs만 status=skipped, payload={ count_total: 0 }로 남기는 선택이 있음. 또는 짧은 문구로 post 1건 생성해 “공고가 없었음”을 기록해 두는 것도 가능.

### 9.6 market_benchmarks / listing_benchmarks 기사

- 1단계에서는 **입찰 리포트 3종(daily/weekly/monthly)** 만 구현.
- 2단계에서 “서울 청소 일당 평균”, “현장 거래 수수료 동향” 등 **시장 데이터 기사**를 별도 run_type으로 추가 (데이터 요약 알고리즘 + 템플릿 추가).

### 9.7 region_avg

- 문서에 언급된 region_avg는 등급 산정용. 자동 콘텐츠에서 “지역 평균” 문장을 쓸 때는 **market_benchmarks** 또는 **listing_benchmarks**를 쓰는 것이 현재 스키마와 맞음.

---

## 10. KST 기준일 공용 유틸

날짜·구간 계산을 **한 곳에서만** 수행해 타임존 혼선을 막는다.

- `getKstDateString(date?: Date)` — 오늘 KST 기준 `YYYY-MM-DD`
- `getKstDayRange(date)` — 해당 KST 일자의 [start, end] UTC
- `getKstWeekRange(date)` — 해당 주(월요일 시작) KST [start, end] UTC
- `getKstMonthRange(year, month)` — 해당 월 KST [start, end] UTC
- run_key: 일간 = `getKstDateString()`, 주간 = `YYYY-Wnn`, 월간 = `YYYY-MM`

파일: `lib/content/kst-utils.ts` (또는 `lib/kst-utils.ts`). cron·집계·run_key 계산에서만 이 유틸 사용.

---

## 11. 파일 구조 제안

```
lib/content/
  kst-utils.ts                 # KST 날짜/구간 (위 10)
  content-generation-runs.ts   # run_key 계산, 중복 체크, run insert/update
  tender-report-queries.ts     # tenders 집계 (일/주/월, KST 범위)
  tender-report-formatters.ts  # 원화, 날짜, 지역 문장, 인사이트 문장
  tender-report-templates.ts   # 제목 + 섹션별 본문 (buildSummarySection 등)
  content-quality-guard.ts      # 발행 전 검증 (최소 조건, 실패 조건)
  build-daily-tender-report.ts # 일간: 집계 → 검증 → 본문 → post + queue
  build-weekly-tender-report.ts
  build-monthly-tender-report.ts

app/api/cron/generate-content/
  route.ts                     # type=daily|weekly|monthly, 발행모드 반영, 보안
```

---

## 12. 구현 단계

| 단계 | 내용 |
|------|------|
| **1단계** | content_generation_runs 마이그레이션, posts에 source_type/source_ref, **발행 모드** env(CONTENT_AUTO_PUBLISH), KST 유틸, **일간만** (집계 → 품질 검증 → 섹션 본문 → slug 고정 → post + queue 최소 적재), 0건 시 skipped, generate-content API, 중복 방지. |
| **2단계** | 주간/월간 추가, 한줄 해석 규칙, (선택) 관리자 발행 모드 스위치 UI + DB 저장. |
| **3단계** | 뉴스레터 발송 시 ref_id로 post 조회·렌더링, 관리자 “자동 생성 로그” 화면(success/failed/skipped, error_message), 재생성(force) 기능. |
| **4단계** | (선택) meta_title/meta_description, payload 고정 포맷(홈 카드용), 시장 데이터 기사, 지역/기관 SEO. |

---

## 13. 추가 권장 사항

### 13.1 SEO 필드 (선택)

자동 글은 메타가 템플릿으로 만들기 쉽다. 추후 추가 시:

- `posts.meta_title` 예: `2026년 3월 11일 청소 입찰 48건 정리 | 클린아이덱스`
- `posts.meta_description` 예: `오늘 등록된 청소·소독·방역 입찰 48건과 예산 상위 공고, 지역별 분포를 확인하세요.`

### 13.2 payload 고정 포맷 (홈·카드용)

`content_generation_runs.payload`에 항상 넣을 필드:

- `count_total`, `budget_total`, `top_region`, `top_budget`, `date_range`  
→ 홈 “오늘 청소 입찰 N건” 카드 등에서 재조회 없이 사용 가능.

### 13.3 관리자 자동 생성 로그

- `/admin/content-runs` 또는 newsletter/posts 옆에 “최근 자동 생성 결과” 목록.
- 컬럼: run_type, run_key, status(success/failed/skipped), source_count, error_message, created_at, 링크(generated_post_id).

### 13.4 재생성(force) 기능

- 동일 run_key에 대해 “기존 post 교체 + queue 갱신” 옵션.  
  예: G2B 수집이 늦어 06:30 기사에 30건만 반영됐을 때, 08:00에 운영자가 재생성 버튼으로 50건 반영된 글로 교체.
- API: `POST /api/cron/generate-content?type=daily&force=true` (관리자 또는 cron secret 필수).

---

## 14. 종합: 비용·속도·품질·공개 수준

### 14.1 서버 비용 최소화

- **집계**: 일간은 당일만 조회(인덱스 활용). 주/월은 구간 쿼리 1회, 필요 시 나중에 materialized view.
- **생성**: cron 1일 1회(일간), 주 1회(주간), 월 1회(월간). 추가 API 호출·폴링 없음.
- **queue**: 본문 저장 안 하고 ref만 두어 저장·대역 최소화.
- **LLM 미사용**: 템플릿 기반이라 비용·지연 없음.

### 14.2 서비스 속도 최대화

- **목록/상세**: 기존 posts 인덱스(published_at, source_type). 자동 글도 동일 테이블이라 추가 쿼리 없음.
- **발송 시**: queue → ref_id로 post 1건 조회 후 렌더. 캐시 가능하면 발송 직전에만 조회.
- **cron**: 생성 로직이 무거우면 타임아웃 상한 두고, 실패 시 run = failed로 남기고 재시도는 다음 스케줄 또는 수동.

### 14.3 콘텐츠 품질

- **발행 전 검증**: 최소 건수·본문 길이·상위 입찰 존재·null/undefined 미포함 등(섹션 5.2).
- **0건 미발행**: 일간 0건은 post 생성 안 함(skipped).
- **섹션 조립**: 본문을 함수 단위로 나누어 테스트·수정 용이.
- **발행 모드 스위치**: 초기엔 검수 모드로 품질 확인 후 자동 발행 전환.

### 14.4 다수 사용자 공개 가능 수준

- **즉시 적용 가능**: 1단계(일간 + 검수 모드 + 품질 검증 + KST + queue 최소화 + slug 고정)까지 구현하면, 소규모 공개·테스트에 무리 없음.
- **재보완 후 공개 확대**: 관리자 로그 UI, 재생성, (선택) 발행 모드 스위치 DB화, 뉴스레터 발송 시 post 기반 렌더링 검증. 0건·실패 시 알림(이메일/슬랙 등) 있으면 운영 안정.
- **지속 개선**: 메타 태그, payload 카드 활용, 주/월 리포트 추가로 “데이터 미디어” 체감을 높일 수 있음.

---

## 15. 요약

- **수동**: posts + content_categories(약품/장비/근로/업계이슈). 사람이 청소용품·장비·이슈만 작성.
- **자동**: 매일/매주/매월 tenders 집계(KST) → 품질 검증 → 섹션 본문 → 고정 slug → posts(source_type/source_ref) + newsletter_queue(참조만). content_generation_runs로 중복·실패·skipped 관리.
- **발행 모드**: 자동 발행 / 검수·수동 발행 스위치(1차 env, 2차 Admin UI). 생성과 발행 분리로 운영 안정성 확보.
- **보완 7가지 반영**: (1) 생성·발행 분리·스위치 (2) slug 날짜+타입 고정 (3) 본문 섹션 함수 조립 (4) 일간 0건 = skipped (5) queue 요약/참조만 (6) KST 공용 유틸 (7) 품질 검증 규칙 코드화.

이 설계대로 진행하면 “사람이 쓰지 않아도 매일/매주/매월 콘텐츠가 발행되는 시스템”을 **서버비용 최소·속도·품질·다수 사용자 공개**를 고려한 형태로 도입할 수 있습니다.
