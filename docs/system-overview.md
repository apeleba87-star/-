# Newslett / 클린아이덱스 — 시스템 전체 설명

신규 개발자·운영자가 한 번에 파악할 수 있도록 전체 시스템을 정리한 문서입니다.

---

## 1. Tech stack

| 항목 | 기술 |
|------|------|
| **Framework** | Next.js 16 (App Router), React 19 |
| **DB** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (OAuth + 이메일/비밀번호, magic link via OTP) |
| **결제** | Bootpay (`@bootpay/backend-js`) — 빌링키·영수증 검증 |
| **스타일** | Tailwind CSS, Framer Motion, Lucide React |
| **기타** | fast-xml-parser (G2B XML), TypeScript |
| **배포** | `next build` / `next start` (Vercel 등 표준 배포 가능) |

- 클라이언트 Supabase: `@supabase/ssr` + `@supabase/supabase-js` (브라우저·서버 공통).

---

## 2. Database

### 2.1 테이블 및 용도

| 테이블 | 용도 |
|--------|------|
| **profiles** | Auth 확장: 이메일, display_name, role, subscription_plan, phone, onboarding_done |
| **content_categories** | CMS 카테고리 (약품/장비/근로/업계이슈) |
| **posts** | CMS 글 (뉴스레터 포함 여부, published_at) |
| **bids** | (레거시) 입찰 스냅샷 — 현재는 **tenders** 사용 |
| **tenders** | 나라장터(G2B) 입찰 공고: 공고번호, 기관, 마감일, 예산, clean_score, keywords_matched 등 |
| **tender_details** | 입찰 상세 (자격요건, 첨부) |
| **tender_regions**, **tender_licenses**, **tender_changes** | 입찰 지역/면허/변경이력 |
| **contracts** | 계약정보서비스 연동 계약 데이터 |
| **user_saved_tenders** | 사용자별 입찰 스크랩 |
| **tender_keywords** | 청소 관련 키워드 사전 (관리자 수정) |
| **g2b_fetch_checkpoints** | G2B 수집 체크포인트(날짜 구간별) |
| **categories** | 청소 카테고리 (대/소분류, admin 관리) — job_posts, listings, market_benchmarks에서 참조 |
| **job_posts** | 구인글 (현장 1건 = 1 job_post) |
| **job_post_positions** | 포지션별 인원·일당·카테고리·마감·filled_count |
| **job_post_private_details** | 구인글 비공개 상세 (주소·연락처·주차 — 확정자만) |
| **job_applications** | 지원 (applied → accepted/rejected/cancelled/no_show_reported) |
| **completed_job_assignments** | 확정 시점 원장 (단가·지역·카테고리 집계용) |
| **job_reports** | 노쇼/미지급/기타 신고, rescinded, appeal_text |
| **worker_profiles**, **company_profiles** | 작업자/업체 프로필 |
| **member_capabilities** | 온보딩 기반 권한: can_apply_jobs, can_post_jobs, can_post_contracts, can_post_promotions |
| **listings** | 현장거래 게시글 (sale_regular, referral_regular, referral_one_time, subcontract 등) |
| **listing_benchmarks** | 현장거래 유형·지역·카테고리별 수수료/월수금/매매가/배수 중앙값 (플랫폼 데이터 기반) |
| **market_benchmarks** | 지역·카테고리·단위별 시장 평균 단가 (구인·리스팅 참고용) |
| **seller_metrics** | 사장 등급(S/A/B/C/D/N), 완료율, 노쇼율 등 |
| **listing_reviews**, **listing_incidents** | 리스팅 후기·문제/신고 |
| **ugc** | UGC: field/review/issue, status(pending/approved/rejected) |
| **region_avg** | 지역·업종별 평균 (등급 산정) |
| **newsletter_queue** | 뉴스레터 큐 (auto/manual/ugc) |
| **newsletter_issues** | 뉴스레터 회차 (발송 시점) |
| **newsletter_subscribers** | 이메일 구독자 (Auth와 별도) |
| **reports** | UGC/게시글 신고 |
| **ad_slots** | 뉴스레터 광고 슬롯 |
| **home_ad_slots**, **home_ad_campaigns** | 홈 광고 슬롯·캠페인 |
| **subscriptions** | Bootpay 빌링키, next_billing_at, status(active/cancelled/past_due) |
| **estimate_config** | 견적 계산기 단가·상수 (JSONB, 단일 행) |

### 2.2 RLS 요약

- **공개 읽기**: content_categories, posts(published), tenders, tender_*, contracts, categories, job_posts, job_post_positions, listings, listing_benchmarks, market_benchmarks, seller_metrics, ugc(approved), newsletter_issues(sent), region_avg, estimate_config.
- **본인만**: profiles(ALL), subscriptions(본인), user_saved_tenders(ALL).
- **구인**: job_post_private_details — 구인자 또는 해당 글 accepted 지원자만 SELECT; job_applications — 지원자 본인 또는 해당 글 구인자; completed_job_assignments — 구인자만 INSERT/DELETE.
- **프로필 추가 노출**: profiles — 구인글 작성자만 SELECT(닉네임 등), 구인자→확정 지원자만 SELECT(연락처·이메일).
- **관리자(admin/editor)**: posts, newsletter_*, ugc, reports, ad_slots, newsletter_subscribers, categories, tender_keywords, g2b_fetch_checkpoints, estimate_config, job_reports(전체 SELECT).
- **job_reports**: 신고자/피신고자 SELECT·UPDATE; 피신고자는 status/rescinded_at 변경 불가(트리거로 차단).

### 2.3 트리거

| 트리거 | 테이블 | 역할 |
|--------|--------|------|
| **on_auth_user_created** | auth.users | 새 사용자 시 profiles 삽입 (handle_new_user) |
| **listings_normalize_wage_trigger** | listings | pay_amount/pay_unit 변경 시 normalized_daily_wage·hourly 계산 |
| **job_post_positions_normalize_wage_trigger** | job_post_positions | 일당 환산 |
| **job_post_positions_update_status_trigger** | job_post_positions | filled_count에 따라 status(open/partial/closed) 갱신 |
| **sync_position_filled_count_trigger** | job_applications | accepted 개수로 position filled_count 동기화 |
| **sync_listing_category_text_trigger** | listings | category_main_id/sub_id → category_main/sub 텍스트 동기화 |
| **job_reports_deny_reported_status_trigger** | job_reports | 피신고자가 status/rescinded_at 변경 시 예외 |
| **profiles_prevent_role_update_trigger** | profiles | role 변경 시 예외 (권한 상승 방지) |

### 2.4 RPC

| 함수 | 용도 |
|------|------|
| **confirm_application** | 지원 확정: 소유자 검증, 정원·시간 겹침 검사, accepted 처리, completed_job_assignments 삽입, 겹치는 확정 취소, 전 포지션 마감 시 job_posts closed |
| **get_job_post_application_counts** | 구인글 ID 배열 → 글별 지원자 수 반환 (목록 노출용, RLS 우회) |
| **refresh_market_benchmarks** | listings 기준 market_benchmarks 집계 갱신 (SECURITY DEFINER) |
| **refresh_listing_benchmarks** | listings 기준 listing_benchmarks 집계(fee/monthly/deal/multiplier, 표본 30~80) |
| **slots_overlap_ts** | 두 슬롯(날짜+시간) 겹침 여부 (confirm_application 내부) |

---

## 3. Auth & 사용자

### 3.1 로그인 방식

- **OAuth**: Google, Naver, Kakao (`signInWithOAuth` → `/auth/callback`).
- **이메일/비밀번호**: `signInWithPassword` (로그인 페이지).
- **Magic link**: `type` + `token_hash` 쿼리로 `/auth/callback`에서 `verifyOtp` 처리.

### 3.2 Auth callback

- **경로**: `app/auth/callback/route.ts`.
- **역할**: `code` 교환 또는 OTP 검증 후 세션 설정, `next`로 리다이렉트.
- **보안**: `next`가 `//`, `http://`, `https://`로 시작하거나 `..` 포함 또는 경로가 `/`로 시작하지 않으면 `/onboarding`으로 고정 (오픈 리다이렉트 방지).

### 3.3 프로필(profiles)

- **role**: `subscriber` | `editor` | `admin` (기본값 subscriber). **DB 트리거로 role 변경 불가** — admin/editor는 DB·시드에서만 부여.
- **subscription_plan**: `free` | `paid` (Bootpay 구독과 연동).
- **onboarding_done**: 온보딩 완료 여부; 미완료 시 온보딩 페이지로 유도.

### 3.4 온보딩

- **경로**: `/onboarding`.
- **동작**: 로그인 사용자만 접근, `onboarding_done`이면 `/`로 리다이렉트.
- **선택지**: work(구직), operate(구인 등), promote(도급·홍보) — 복수 선택.
- **결과**: `profiles.onboarding_done = true`, `member_capabilities`에 can_apply_jobs, can_post_jobs, can_post_contracts, can_post_promotions 반영.

### 3.5 회원가입

- **경로**: `/signup`.
- **기능**: 이메일/비밀번호, 닉네임, 휴대폰; 이메일·닉네임 중복 확인(actions). 가입 후 `handle_new_user`로 profiles 생성.

---

## 4. 메인 앱 라우트 (app/)

| 경로 | 역할 |
|------|------|
| **/** | 홈: 입찰 요약·오늘 공고·뉴스·최근 리스팅·뉴스레터·구인 수·광고 슬롯 |
| **/login** | 로그인 (OAuth + 이메일/비밀번호) |
| **/signup** | 회원가입 (이메일 중복 등 검사) |
| **/onboarding** | 활동 선택(구직/구인/도급·홍보) 후 capabilities 저장 |
| **/jobs** | 구인 목록 (필터·정렬, limit 50) |
| **/jobs/new** | 구인글 작성 |
| **/jobs/[id]** | 구인 상세 (지원/확정/비공개 정보 노출은 권한별) |
| **/jobs/[id]/edit** | 구인글 수정 |
| **/jobs/manage** | 내 구인글 관리 (목록·달력·전체 지원자·확정) |
| **/jobs/matches** | 내 매칭 (지원·확정된 현장, 달력 뷰) |
| **/listings** | 현장거래 목록 (limit 50) |
| **/listings/new** | 현장거래 등록 (카테고리·단가·벤치마크·listing_benchmarks) |
| **/listings/[id]** | 현장거래 상세 |
| **/categories** | 카테고리 목록 |
| **/categories/[slug]** | 카테고리별 콘텐츠 |
| **/tenders** | 입찰 목록 (필터·limit) |
| **/tenders/[id]** | 입찰 상세 |
| **/tenders/dashboard** | 입찰 대시보드 |
| **/contracts** | 계약 목록 |
| **/subscribe** | 유료 구독(Bootpay) 신청·결제 |
| **/posts/[id]** | CMS 글 상세 |
| **/archive** | 아카이브 목록 |
| **/archive/[id]** | 아카이브 상세 |
| **/ugc** | UGC 목록 |
| **/ugc/new** | UGC 작성 |
| **/ugc/[id]** | UGC 상세 |
| **/estimate** | 견적 계산기 |
| **/mypage** | 마이페이지 (내 구인 관리 링크 등) |
| **/admin** | 관리자 진입 |
| **/admin/posts** | CMS 글 목록 |
| **/admin/posts/new**, **/admin/posts/[id]/edit** | CMS 글 작성·수정 |
| **/admin/ugc** | UGC 승인/거절 |
| **/admin/reports** | 신고 목록 |
| **/admin/job-reports** | 노쇼 신고 관리 |
| **/admin/ads** | 광고 슬롯 |
| **/admin/categories** | 카테고리 관리 |
| **/admin/tender-keywords** | 입찰 키워드 관리 |
| **/admin/newsletter** | 뉴스레터 |
| **/admin/estimate-config** | 견적 설정 |

---

## 5. API 라우트 (app/api/)

| 경로 | 메서드 | 용도 | 인증 |
|------|--------|------|------|
| **/api/auth/signout** | POST | 로그아웃 후 `/` 리다이렉트 | 세션 |
| **/api/subscribe/register** | POST | Bootpay 빌링키 등록, subscriptions upsert, profiles subscription_plan 갱신 | 로그인 |
| **/api/subscribe/register-with-receipt** | POST | 영수증 검증 후 구독 등록 | 로그인 |
| **/api/newsletter/send** | POST | 큐 항목으로 뉴스레터 회차 생성·발송 | admin/editor |
| **/api/cron/fetch-g2b** | POST | G2B 입찰 수집, tenders upsert | x-cron-secret |
| **/api/cron/process-subscriptions** | GET | 만료일 도래 구독에 Bootpay 결제 요청, 갱신 | Bearer CRON_SECRET |
| **/api/cron/close-expired-job-posts** | POST | work_date 지난 구인글 closed 처리 | x-cron-secret |
| **/api/cron/cleanup-closed-tenders** | POST | 마감 3개월 지난 입찰 삭제 | x-cron-secret |
| **/api/cron/daily-digest** | POST | 오늘 입찰 건수로 newsletter_queue에 auto 항목 삽입 | x-cron-secret |
| **/api/cron/backfill-clean-score** | POST | clean_score 백필 등 | x-cron-secret |
| **/api/admin/fetch-g2b** | POST | 관리자 수동 G2 수집 (?stream=1 시 NDJSON) | admin/editor |
| **/api/admin/refresh-market-benchmarks** | POST | refresh_market_benchmarks RPC 호출 | admin/editor |
| **/api/admin/ugc** | PATCH | UGC status → approved/rejected | admin/editor |
| **/api/test-g2b** | GET | G2B 연동 테스트 (safeFetch 사용) | — |
| **/api/debug/g2b-atch** | — | G2B 첨부 디버그 | — |
| **/api/supabase-test** | — | Supabase 연결 테스트 | — |

---

## 6. 핵심 비즈니스 기능

| 기능 | 설명 |
|------|------|
| **구인 (job posts)** | 현장 단위 구인글 + 포지션별 인원·일당·카테고리. 지원→확정→completed_job_assignments 기록. 노쇼/미지급 시 job_reports, 피신고자 이의(appeal_text). 확정은 RPC confirm_application으로 원자 처리. 구인 1분 3건·10분 10건 제한, 노쇼 신고 1분 5건 제한. |
| **현장거래 (listings)** | 유형: sale_regular, referral_regular, referral_one_time, subcontract. 지역·카테고리·일당/반당/시급·normalized 단가. listing_benchmarks(플랫폼 데이터 기반 중앙값), seller_metrics·등급. |
| **입찰 (tenders)** | 나라장터(G2B) 연동. 키워드 매칭, clean_score, 청소 관련 필터. 스크랩(user_saved_tenders). 마감 공고 정리 cron. |
| **뉴스레터** | newsletter_queue(auto/manual/ugc) → newsletter_issues 발송. newsletter_subscribers(이메일). send API는 admin/editor 전용. |
| **구독 (Bootpay)** | 빌링키 저장(subscriptions), 월 정기 결제. process-subscriptions cron으로 만료일 도래 시 결제 요청. profiles.subscription_plan 연동. |
| **UGC** | field/review/issue. status: pending → admin이 approved/rejected. RLS로 approved만 공개 읽기. |

---

## 7. 보안

- **RLS**: 프로필·구인·노쇼 신고·구독 등 민감 데이터는 역할·관계별 정책 적용 (위 2.2 참고).
- **Auth callback**: `next` 검증으로 오픈 리다이렉트 방지.
- **권한 상승 방지**: `profiles_prevent_role_update_trigger`로 role 변경 차단.
- **노쇼 신고 악용 방지**: `job_reports_deny_reported_status_trigger`로 피신고자가 status/rescinded_at 변경 불가.
- **Cron**: `CRON_SECRET` 설정 시 `x-cron-secret` 또는 Bearer 검사; 운영 시 반드시 설정 권장.
- **Admin API**: `getUser()` 후 profiles.role이 admin/editor인지 확인, 아니면 403.
- **목록 제한**: jobs/listings 목록 limit 50; offset 상한 1000 권장.
- **SSRF·타임아웃**: `lib/safe-fetch.ts` — allowedHosts 화이트리스트, 5초 타임아웃. G2B·Bootpay 등 외부 호출에 사용.
- **상세**: `docs/security-audit-and-hardening.md` 참고.

---

## 8. Lib / 공용 모듈

| 모듈 | 용도 |
|------|------|
| **lib/supabase.ts** | 브라우저용 `createClient()` (@supabase/ssr). |
| **lib/supabase-server.ts** | 서버용: `createClient()`(anon), `createServerSupabase()`(쿠키 세션), `createServiceSupabase()`(service role). |
| **lib/g2b/client.ts** | 나라장터 API 클라이언트. safeFetch + G2B_ALLOWED_HOSTS, XML 파싱. |
| **lib/g2b/fetch-tenders.ts** | G2B 수집 오케스트레이션. |
| **lib/g2b/clean-score.ts**, **backfill-clean-score.ts** | 청소 관련 점수·백필. |
| **lib/g2b/keywords.ts**, **mapper.ts** | 키워드·매핑. |
| **lib/bootpay-server.ts** | Bootpay 토큰, 영수증 검증, 빌링 결제 요청. 5초 타임아웃. |
| **lib/safe-fetch.ts** | SSRF 방지(허용 host), AbortSignal.timeout(5초). |
| **lib/listings/listing-category-presets.ts** | 정기/일회성 카테고리 옵션. |
| **lib/listings/resolve-listing-category.ts** | slug → category id 등 해석. |
| **lib/listings/wage.ts**, **grade.ts**, **types.ts** | 단가·등급·타입. |
| **lib/jobs/job-type-presets.ts**, **resolve-job-type.ts** | 구인 타입 프리셋·해석. |
| **lib/jobs/kst-date.ts**, **age-range.ts**, **conflict.ts** | KST 날짜, 나이 범위, 시간 충돌. |
| **lib/ads.ts** | 홈 광고 슬롯·캠페인 조회. |
| **lib/estimate-config.ts**, **estimate-calc.ts** | 견적 설정 조회·계산. |

---

## 9. 문서·참고

- **보안 점검·운영 보안**: `docs/security-audit-and-hardening.md`
- **구인 테스트 시나리오**: `docs/jobs-test-scenarios.md`
- **현장거래 단가·벤치마크 설계**: `docs/listings-unit-price-and-benchmarks-design.md`
- **리스팅·구인 가동 테스트 결과**: `docs/test-result-listings-and-jobs.md`

이 문서는 코드·마이그레이션 기준으로 작성된 개요이며, 세부 구현은 각 파일과 위 문서를 참고하면 됩니다.
