# Newslett — 설계 보충 및 구현 가이드

## 1. 서비스 한 줄 정의 (유지)

> 청소업 정보를 **"데이터(나라장터) + 커뮤니티(UGC) + 운영자 콘텐츠(CMS)"**로 생산하고,  
> 웹사이트 아카이브와 **뉴스레터**로 자동 배포하는 미디어 플랫폼

---

## 2. 보충이 필요한 부분

### 2.1 데이터/백엔드 보강

| 항목 | 현재 명세 | 보충 제안 |
|------|-----------|-----------|
| **DB 테이블** | bids, posts, ugc, newsletter_queue, newsletter_issues | **추가 권장**: `profiles`(구독자·등급), `subscriptions`(유료 구독), `ad_slots`, `reports`(신고), `content_categories` |
| **구독자·멤버십** | “구독자 기능”만 언급 | **정의 필요**: 무료(이메일만) vs 유료(Stripe/토스 등), 플랜명·가격, 구독 상태 저장 위치(Supabase `subscriptions` 또는 결제사 웹훅) |
| **나라장터 연동** | “나라장터 API 수집” | **확인 필요**: [공공데이터포털](https://www.data.go.kr) 또는 [나라장터 API](https://www.g2b.go.kr) 인증키·엔드포인트, “청소” 키워드/업종 코드 매핑 |
| **등급 산정 주기** | A/B/C 기준(평균 대비 ±% 등) | **보충**: 참조 평균을 어디에·몇 일 단위로 갱신할지(예: `region_job_avg` 테이블 + 주 1회 배치), 등급 재계산 주기 |

### 2.2 뉴스레터·이메일 보강

| 항목 | 보충 제안 |
|------|-----------|
| **발송 인프라** | Resend 권장(Next.js 연동·API 단순). 대안: AWS SES, Workspace SMTP |
| **구독자 목록** | Supabase `profiles` 또는 `newsletter_subscribers` 테이블 + 이메일/구독상태/수신동의일. Resend Audience와 동기화할지 결정 |
| **큐 → 발송 흐름** | “큐에 적재” 후 **발송 시점**에 큐 항목을 모아 1개 `newsletter_issues` 레코드로 묶고, HTML/텍스트 본문 생성 → Resend API 호출 |

### 2.3 운영·관리자 보강

| 항목 | 보충 제안 |
|------|-----------|
| **관리자 권한** | Supabase Auth + `profiles.role` (예: `admin`/`editor`) 또는 별도 Admin 테이블. RLS로 CMS·큐·검수 API는 `role=admin`만 접근 |
| **UGC 검수** | `ugc` 테이블에 `status: pending | approved | rejected`, 운영자 “검수 후 공개” 시 `approved`로 변경. 목록/상세 API는 `approved`만 공개 |
| **신고** | `reports` 테이블 (target_type: ugc/post, target_id, reporter_id, reason, status). “스팸/허위 신고” 관리 화면에서 처리 |

### 2.4 트래픽·광고 수치화

| 항목 | 보충 제안 |
|------|-----------|
| **웹 분석** | GA4 설치(Next.js에 스크립트). 이벤트: 뉴스레터 링크 클릭(UTM), 로그인, 유료 전환 |
| **뉴스레터 지표** | Resend(또는 선택 이메일 서비스) 오픈/클릭 웹훅 수신 → Supabase `newsletter_events` 등에 저장 → “링크별 클릭 순위” 집계 |
| **광고 슬롯** | `ad_slots` (issue_id, slot_index, advertiser_name, link_url, image_url, from_date, to_date). 주간 1개 등 배치 규칙을 코드/설정으로 고정 |

---

## 3. 구현 관점 요약 (어떻게 구현할지)

### 3.1 1단계: “자동 발행” (2~3주)

**목표**: 나라장터 수집 → 오늘 요약 카드 → 웹 아카이브 + 뉴스레터(요약→링크), 운영자 글 CMS → 다음 발송 자동 포함

| 구성 요소 | 구현 방법 |
|-----------|-----------|
| **DB** | Supabase: `bids`(나라장터 공고 스냅샷), `posts`(CMS 글, `newsletter_include: boolean`), `newsletter_queue`(type: auto/manual, ref_id, scheduled_for, created_at), `newsletter_issues`(발송일, subject, html_content, sent_at) |
| **나라장터 수집** | Supabase Edge Function `fetch_g2b_daily`: cron(매일 새벽). 공공데이터/나라장터 API 호출 → 청소 관련 키워드 필터 → `bids` insert. API 키는 Supabase Secrets에 저장 |
| **오늘 요약 생성** | Edge Function `build_daily_digest`: 당일 `bids` 집계(지역별/건수 등) → “오늘 서울 청소 관련 공고 N건” 형태의 메타데이터 또는 HTML 조각 생성 → `newsletter_queue`에 type=auto로 적재 |
| **운영자 글 → 큐** | CMS(Next.js 페이지 또는 간단한 /admin/posts)에서 글 저장 시 `newsletter_include=true`면 `newsletter_queue`에 type=manual, ref_id=posts.id 로 insert. “다음 발송에 포함” = 다음 예정 발송일 기준으로 큐에만 넣으면 됨 |
| **발송** | Edge Function `send_newsletter`: 예정 시각에 실행되는 cron. “오늘 발송분” 큐 항목 조회 → 순서대로 정렬 → 1개 `newsletter_issues` 레코드 생성 + HTML 본문 조합(요약 카드 + 링크 + CMS 글 목록) → Resend API로 발송 → `sent_at` 갱신, 큐 항목은 “사용됨” 처리 |
| **웹 아카이브** | Next.js: `/archive`, `/archive/[id]`. `newsletter_issues` 조회. 공개 영역은 요약만, “전문은 로그인/구독 유도”는 로그인 시에만 본문 노출하도록 조건부 렌더링 |

**결과**: 매일 자동 수집·요약·큐 적재, 운영자 글은 체크 한 번으로 다음 회차에 포함, 뉴스레터는 “요약+링크”로 웹으로 유도.

---

### 3.2 2단계: “UGC 엔진” (4~6주)

**목표**: 현장 공유 폼, 기본 리스트, 평균 단가 산출·“평균 대비 경고”, 주간 “신규 현장/단가 변화” 자동 섹션

| 구성 요소 | 구현 방법 |
|-----------|-----------|
| **UGC 테이블** | `ugc` (type: 현장/후기/이슈제보, 작성자, 지역/면적/주기/평당/작업범위, 별점, 코멘트, status, created_at). 현장용 필드와 후기용 필드를 JSON 또는 컬럼으로 구분 |
| **폼·리스트** | Next.js: `/ugc/new`, `/ugc`(목록). 폼 제출 시 Supabase insert + RLS(본인/관리자만 수정). 목록은 `status=approved`만 공개(검수 플로우) |
| **평균·등급 기초** | 지역/업종/주기별 집계(주 1회 또는 실시간): Supabase SQL 또는 Edge Function으로 `region_job_avg`(또는 동일 목적 테이블) 갱신. “평균 대비 %” = (해당 UGC 단가 − 평균) / 평균. “평균 대비 경고”는 이 %가 임계치 이하일 때 플래그 |
| **주간 자동 섹션** | `build_weekly_digest`: 해당 주 신규 approved 현장 N건, 단가 변화 요약 → “이번 주 신규 데이터” 카드 생성 → `newsletter_queue`에 적재. “신규 현장 5건 이상” 등 임계치 넘을 때만 큐 적재하도록 조건 |
| **검수** | 관리자 화면: `ugc.status=pending` 목록 → 승인/반려. 자동공개 옵션이면 기본값 `approved`로 insert |

**결과**: 사용자가 현장/후기 입력 → 시스템이 평균 대비 % 계산·경고 → 주간 뉴스레터에 “신규 현장/단가 변화” 자동 포함.

---

### 3.3 3단계: “구독 가치·광고” (7~10주)

**목표**: A등급만 보기(유료), 평균 대비 % 표시(유료), 광고 슬롯·리포트(광고 영업용)

| 구성 요소 | 구현 방법 |
|-----------|-----------|
| **등급 산정** | 참조 평균 테이블 활용. A = 상위 20% 또는 평균+15% 이상, C = 하위 20% 또는 평균−20% 이하 등 규칙을 코드로 고정. UGC/현장별로 등급 컬럼 또는 뷰로 계산·캐시 |
| **유료 구독** | Stripe(또는 토스) 구독 플랜 생성 → 웹훅으로 결제 성공 시 `subscriptions` 테이블에 저장. `profiles`에 `plan: free | paid` 또는 `subscription_status` 연결 |
| **노출 제어** | RLS 또는 API: “A등급 필터”, “평균 대비 −XX%”, “수익성 경고”, “지역/업종별 평균 단가 상세”는 `plan=paid`(또는 구독 유효)일 때만 노출. 프론트는 구독 상태에 따라 필터/배지 표시 |
| **광고 슬롯** | `ad_slots` 테이블로 “이번 주 광고 1개” 배치. 뉴스레터 HTML 생성 시 슬롯 조회해 삽입. 광고 리포트 페이지: 캠페인 기간, 노출/클릭(Resend 등 데이터 연동), 랜딩 페이지(GA4) 연결 |

**결과**: 무료는 기본 목록·요약만, 유료는 A등급·평균 대비 %·리포트로 구독 가치 명확화. 광고는 슬롯 단위로 관리·리포트 제공.

---

## 4. 관리자 도구 6종 구현 위치

| 도구 | 구현 위치 |
|------|-----------|
| 콘텐츠 템플릿 버튼 | Next.js `/admin/posts/new`: 약품/장비/이슈 선택 시 미리 정의된 본문/카테고리 적용 |
| 큐 미리보기 | `/admin/newsletter/preview`: 다음 발송 예정일 기준 `newsletter_queue` 항목 조회 → 카드/리스트로 “이번 발송에 뭐 들어가는지” 한 화면 |
| 원클릭 발송/예약 | `/admin/newsletter`: “지금 발송” 버튼 → Edge Function `send_newsletter` 호출(또는 cron 트리거). “예약”은 `scheduled_for` 업데이트 + cron이 해당 시각에 실행 |
| 검수 플래그 | `/admin/ugc`: pending 목록, 승인/반려 버튼 → `ugc.status` 업데이트. 설정으로 “기본 자동공개” 옵션 |
| 스팸/허위 신고 | `/admin/reports`: `reports` 목록, 처리(무시/삭제/경고) → target UGC 처리 및 report.status 갱신 |
| 광고 슬롯 관리 | `/admin/ads`: `ad_slots` CRUD, 회차/기간 지정. 뉴스레터 빌드 시 여기서 조회해 삽입 |

---

## 5. 기술 스택 매핑 (요약)

| 영역 | 선택 | 구현 요약 |
|------|------|-----------|
| DB·Auth | Supabase | 테이블·RLS·Edge Functions·Secrets |
| 수집·배치 | Edge Functions + Cron | fetch_g2b_daily, build_daily_digest, build_weekly_digest, send_newsletter |
| 프론트·SEO | Next.js | 공개 페이지(홈/카테고리/아카이브), 로그인/구독자 전용, /admin |
| 이메일 | Resend 권장 | 발송 API, 구독자 목록·웹훅(오픈/클릭) → DB 저장 |
| 결제 | Stripe 또는 토스 | 구독 플랜, 웹훅 → subscriptions 반영 |
| 분석 | GA4 | 페이지뷰, UTM, 이벤트. 광고 리포트는 GA4 + 뉴스레터 클릭 로그 |

---

## 6. 구현 순서 (체크리스트)

1. **DB 스키마**  
   bids, posts, ugc, newsletter_queue, newsletter_issues, profiles, subscriptions, ad_slots, reports, content_categories(필요 시) 정의 후 마이그레이션.

2. **Auth·프로필**  
   Supabase Auth + `profiles`(role, plan 등). 구독자 이메일 수집은 profiles 또는 별도 subscribers 테이블.

3. **나라장터·일일 요약**  
   fetch_g2b_daily(cron) → build_daily_digest → newsletter_queue 적재.

4. **CMS·큐·발송**  
   posts CRUD, “뉴스레터 포함” 시 queue 적재. send_newsletter에서 큐 모아 Resend로 발송.

5. **웹 아카이브·홈**  
   홈: 오늘 요약 카드. 아카이브: 회차별 목록/상세, 로그인 시 전문.

6. **UGC·검수·주간 요약**  
   ugc 폼/리스트, 검수, build_weekly_digest, 큐 적재.

7. **등급·유료·광고**  
   등급 로직, Stripe/토스 연동, ad_slots, 관리자 도구 6종.

이 순서대로 진행하면 “자동 발행 → UGC → 구독 가치·광고” 단계를 안정적으로 구현할 수 있습니다.
