# 리포트 생성·글 관리 구현 방안

## 1. 요구사항 정리

| 구분 | 내용 |
|------|------|
| **기존 유지** | "2026년 3월 18일 수요일 등록 업종 기준 입찰 5건 정리" — **현재와 동일**하게 자동생성 로그에서 생성 후 글 관리(발행) 가능. |
| **신규 리포트** | 주간 시장 요약, 마감 임박, 준비기간 짧은 공고, 재공고 기관 등 — **다른 곳에서 글 관리**. 필요 시 "글 발행"으로 게시 가능. |
| **글 발행 시 표기** | 신규 리포트를 글로 발행할 때는 "입찰리포트"가 아니라 **"주간시장요약 리포트"** 등 **리포트 유형명**으로 표기. |
| **트리거** | **리포트 생성 1회** 실행 시 → 기존 일간 정리 **+** 신규 구조 리포트들 **모두** 자동 생성. |

---

## 2. 현재 흐름(참고)

- **진입**: 관리자 "수동 생성" 버튼 또는 cron `POST /api/cron/generate-content?type=daily`
- **실행**: `buildDailyTenderReport()` → `aggregateDailyTenders()` → 제목/본문/슬러그 생성 → **posts 1건 insert** (source_type=`auto_tender_daily`, source_ref=날짜) + newsletter_queue + **content_generation_runs 1행** (generated_post_id = 해당 post)
- **글 관리**: `/admin/content-runs` → "글 보기" → `/admin/posts/:id/edit` 에서 발행(published_at)

---

## 3. 구현 구조 제안

### 3.1 데이터 저장 구조

- **기존 일간 리포트**: **변경 없음**.  
  - 동일하게 `buildDailyTenderReport()` → **posts 1건** + content_generation_runs 1행(run_type=`daily_tender_digest`).
- **신규 리포트(주간 시장 요약 등)**: **posts와 분리**해서 저장.
  - **테이블**: `report_snapshots` (신규)
    - 한 번의 "리포트 생성" 실행으로 **여러 타입**의 리포트가 각각 1행씩 쌓임.
  - **글 발행** 시에만 이 스냅샷을 기반으로 **posts 1건** 생성/연결.

이렇게 하면:
- "글 관리"는 **일간 입찰 정리**는 기존처럼 content-runs → post 편집으로,
- **나머지 리포트**는 **리포트 전용 관리 화면**에서 스냅샷 목록 보고, 선택해서 "글 발행" 시에만 post가 생기고, 그때 표기는 "주간시장요약 리포트" 등으로 함.

### 3.2 report_snapshots 테이블 (신규)

```
report_snapshots
- id (uuid, PK)
- run_id (uuid, FK → content_generation_runs.id, nullable)  // 어떤 생성 run에서 나왔는지
- report_type (text, NOT NULL)   // weekly_market_summary | deadline_soon | prep_short | rebid_institutions | ...
- period_key (text, NOT NULL)    // 2026-03-18 | 2026-W12 | 2026-03 등
- title (text)                   // 저장용 제목
- content_full (jsonb)            // 저장용 원본: 한줄결론, 핵심수치3, TOP3, 실무해석, 다음행동, 비교/비중/태그 등
- content_summary (jsonb)         // 화면용 요약: 한줄결론, 핵심수치3, TOP3, 실무해석
- content_social (text)           // 소셜용 축약 문장 1~2줄
- published_post_id (uuid, FK → posts.id, nullable)  // 글 발행 시 연결된 post
- created_at, updated_at
```

- **run_id**: 같은 "리포트 생성" 실행에서 만들어진 스냅샷끼리 묶을 때 사용 (선택).
- **report_type**: 주간시장요약, 마감임박, 준비기간짧은공고, 재공고기관, 계약방법별, 면허제한, 전국vs지역, 반복발주기관, 지역+기관 결합 등.
- **content_full / content_summary / content_social**: 앞서 정한 "저장용 / 화면용 / 소셜용" 3단계.
- **published_post_id**: "글 발행" 시 생성한 post.id 저장. 나중에 "수정 후 재발행"이면 해당 post 업데이트 후 같은 published_post_id 유지.

### 3.3 posts 쪽 확장 (최소)

- **source_type**에 신규 값 추가:  
  `auto_tender_daily`(기존), `weekly_market_summary`, `deadline_soon`, `prep_short`, …  
  또는 공통으로 `tender_report` + **report_type**을 별도 컬럼/메타로 저장.
- **표기 규칙**:  
  - `auto_tender_daily` → 기존처럼 "입찰 리포트" 또는 "n월 n일 리포트".  
  - 그 외 report_type → 화면/목록에서 **리포트 유형 라벨**로 표시 (예: "주간시장요약 리포트", "마감 임박 리포트").

---

## 4. 실행 흐름 (리포트 생성 1회)

1. **진입점 유지**  
   - 관리자 "수동 생성" → `POST /api/admin/generate-content?type=daily`  
   - Cron → `POST /api/cron/generate-content?type=daily`  
   - (선택) type=weekly 등 추가 시 동일 API에 type 확장.

2. **한 번의 실행 안에서 할 일**
   - **(A) 기존 일간 리포트 (그대로)**  
     - `buildDailyTenderReport()` 호출 → post 1건 + content_generation_runs 1행(daily_tender_digest).  
     - 제목 형식: "2026년 3월 18일 수요일 등록 업종 기준 입찰 5건 정리" 유지.
   - **(B) 신규 리포트들 (추가)**  
     - 같은 run(또는 같은 period_key 기준)으로:
       - 주간 시장 요약, 마감 임박, 준비기간 짧은 공고, 재공고 기관, 계약방법별, 면허·업종 제한, 전국 vs 지역제한, 반복 발주 기관, 지역+기관 결합 등 **구현된 타입만큼** 집계/생성.
       - 각각 **report_snapshots**에 1행씩 insert (content_full, content_summary, content_social 채움).  
     - **posts는 만들지 않음.**  
     - (선택) content_generation_runs에 "다중 결과"를 남기고 싶다면:
       - run 1개에 여러 스냅샷을 연결할 때 `run_id`만 넣거나,
       - 별도 테이블 `content_run_report_snapshots(run_id, snapshot_id)` 로 N:N 연결.

3. **실패/스킵 정책**
   - 일간 리포트 실패 시: 기존처럼 run status=failed, 신규 스냅샷은 생성하지 않거나, 일간만 실패하고 스냅샷만 생성하는 정책 중 하나 선택.
   - 일간은 0건으로 스킵 시: run=skipped; 신규 리포트는 "해당 기간 데이터 있으면" 스냅샷만 생성해도 됨 (주간/마감임박 등은 기간이 다르므로).

---

## 5. 글 관리 쪽

### 5.1 기존 (유지)

- **자동 생성 로그** (`/admin/content-runs`):  
  - run_type= daily_tender_digest, run_key=날짜 → **글 보기** → 해당 **post** 편집/발행.  
  - 여기서 나온 글은 계속 "입찰 리포트"(일간)로 표기.

### 5.2 신규 리포트 전용 관리

- **경로**: 예) `/admin/report-snapshots` 또는 `/admin/reports` (리포트 스냅샷 목록).
- **기능**:
  - 기간(period_key), 리포트 유형(report_type)으로 필터.
  - 각 행: 제목, 리포트 유형(한글 라벨), period_key, 생성일, **글 발행 여부**(published_post_id 유무).
  - **"글 발행" 버튼**:
    - 해당 스냅샷의 content_summary(또는 content_full)로 **posts 1건 생성** (title, body, excerpt, slug, **source_type= 해당 report_type 또는 공통값**, source_ref=period_key).
    - report_snapshots.published_post_id = 방금 만든 post.id 로 업데이트.
  - 이미 발행된 스냅샷은 "글 보기/수정" 링크로 `/admin/posts/:id/edit` 이동.  
    (선택) "재발행" 시 기존 post 내용을 스냅샷 최신으로 덮어쓰기.

### 5.3 발행 시 표기 ("주간시장요약 리포트")

- **posts.source_type** (또는 report_type)에 따라 **목록/상세에서 표시할 라벨** 매핑:
  - `weekly_market_summary` → "주간시장요약 리포트"
  - `deadline_soon` → "마감 임박 리포트"
  - `prep_short` → "준비기간 짧은 공고 리포트"
  - …
- **news 페이지** 등에서 post 목록 노출 시:  
  `source_type === 'auto_tender_daily'` → 기존 "입찰 리포트" / 날짜,  
  그 외 → 위 라벨 사용.  
  이렇게 하면 "입찰리포트"가 아닌 "주간시장요약 리포트" 등으로만 노출 가능.

---

## 6. 구현 단계 제안

| 단계 | 작업 |
|------|------|
| **1** | **report_snapshots 마이그레이션** (run_id, report_type, period_key, title, content_full, content_summary, content_social, published_post_id, created_at, updated_at). 인덱스: report_type, period_key, created_at. |
| **2** | **리포트 타입·라벨 상수** 정의 (report_type enum 또는 상수, 한글 라벨 매핑). posts 표기용. |
| **3** | **주간 시장 요약 1종만** 먼저: 집계 로직(기존 tender 쿼리/일간 집계 확장 또는 별도 주간 집계) + content_full/summary/social 생성 로직 → report_snapshots에 insert. |
| **4** | **generate-content 진입점 수정**: `buildDailyTenderReport()` 호출 후, 성공/스킵 여부와 무관하게(또는 성공 시에만) "주간 시장 요약" 스냅샷 생성 함수 호출. (같은 run_key/period는 run 1회당 1번만 생성하도록 중복 방지.) |
| **5** | **/admin/report-snapshots** 목록 페이지: 테이블, 필터, "글 발행" 버튼 → post 생성 + published_post_id 갱신. |
| **6** | **posts 표기**: news(또는 posts 목록)에서 source_type/report_type별 "주간시장요약 리포트" 등 라벨 표시. |
| **7** | 나머지 리포트 타입(마감 임박, 준비기간 짧은 공고, 재공고 기관 등)을 **같은 패턴**으로 집계·스냅샷 생성 로직 추가하고, generate-content에서 순차 호출. |

---

## 7. 정리

- **기존 "등록 업종 기준 입찰 N건 정리"**: 현재처럼 **자동생성 로그 → 발행**으로 유지.
- **신규 리포트**: **리포트 생성 시 자동으로 report_snapshots에만 저장**하고, **별도 글 관리 화면**에서만 보고, 원할 때만 **글 발행**으로 post 생성.  
  발행된 글은 **"주간시장요약 리포트"** 등 **리포트 유형명**으로만 표기되게 하면, 요구사항을 만족하는 구현이 됨.
