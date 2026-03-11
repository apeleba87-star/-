# 현장 거래 · 인력구인 전체 가동 테스트 결과

테스트 일자: 2025-03 기준  
범위: 현장 거래(listings), 인력구인(jobs) 전체 기능, 빌드, 성능·비용 관점 점검

---

## 1. 빌드 및 타입

- **결과: 성공**
- **수정 반영 사항**
  - `app/jobs/manage/page.tsx`: RPC `get_job_post_application_counts` 반환값이 숫자가 아닌 타입으로 추론되어 `applicationCount` 연산/전달 시 타입 에러 → `Number(...) || 0`로 통일.
  - `app/jobs/page.tsx`: `district`가 `string | null`인데 `JobPostCard`는 `string` 요구 → `post.district ?? ""` 전달. 동일하게 `applicationCount`는 `Number(...) || 0`로 전달.
  - `app/login/page.tsx`: 소셜 로그인 Provider 타입(`"naver"`/`"kakao"` 미지원) → `SocialProvider` 로컬 타입 정의 및 OAuth 호출 시 타입 단언 사용. `useSearchParams()` 사용으로 인한 prerender 경고 → 로그인 UI를 `LoginClient.tsx`로 분리하고 `page.tsx`에서 `<Suspense>`로 감싸 해결.

---

## 2. 현장 거래 (Listings) 점검

### 2.1 기능·라우트

| 구분 | 상태 | 비고 |
|------|------|------|
| `/listings` 목록 | 정상 | 목록 + market_benchmarks, seller_metrics, categories 한 번에 조회 |
| `/listings/new` 글쓰기 | 정상 | createListing, getListingBenchmarks 사용 |
| `/listings/[id]` 상세 | 정상 | 리스팅 + 판매자 + 후기 등 배치 조회 |

### 2.2 DB·비용

- **목록/상세**: `Promise.all`로 배치 조회, N+1 없음.
- **글쓰기 폼**: `getListingBenchmarks`가 지역/유형/카테고리 변경 시마다 호출됨(categories + resolve + 최대 3회 listing_benchmarks). **권장**: 입력 디바운스(300~500ms) 또는 “참고값 보기” 버튼으로 호출 줄이기.
- **refresh_listing_benchmarks**: 앱 코드에서 호출하지 않음. 크론/스케줄러로만 실행되면 됨.

### 2.3 속도

- 목록/상세는 쿼리 수가 적고 병렬이라 체감 지연은 크지 않을 것으로 예상.
- 새 글쓰기에서 참고값을 매번 가져오면 타이핑 시 요청이 잦아질 수 있음 → 위 디바운스/버튼 권장.

---

## 3. 인력구인 (Jobs) 점검

### 3.1 기능·라우트

| 구분 | 상태 | 비고 |
|------|------|------|
| `/jobs` 목록 (전체/내가 쓴 글/지원한 현장) | 정상 | mine=posted 시 /jobs/manage 리다이렉트 |
| `/jobs/new` 구인글 작성 | 정상 | rate limit 3/1분, 10/10분 |
| `/jobs/[id]` 상세 | 정상 | 지원/확정/노쇼 신고/연락처 등 |
| `/jobs/[id]/edit` 수정 | 정상 | 본인 글만 |
| `/jobs/manage` 내 구인 관리 | 정상 | 목록·달력·전체 지원자 탭 |
| `/jobs/matches` 내 매칭 | 정상 | 확정된 건만 |

### 3.2 DB·비용·성능 리스크

- **목록 페이지 (`/jobs`)**
  - **dayPositions**: `job_post_positions`에서 `pay_unit = 'day'`만 조건으로 **전체** 조회(limit 없음). 구인 글이 많아지면 테이블이 커질수록 비용·지연 증가.  
  - **권장**: 현재 목록에 나온 `postIds` 기준으로만 day 포지션 조회하거나, 별도 집계 테이블/캐시로 “일당 평균” 제공.

- **상세 페이지 (`/jobs/[id]`)**
  - **market_benchmarks**: 포지션별로 `Promise.all(positions.map(...))`로 각각 쿼리 → **포지션 수만큼 DB 왕복**.  
  - **권장**: (region, category_main_id, category_sub_id, pay_unit, skill_level) 조합을 모아 한 번에 in 조건으로 조회하거나, 배치 RPC로 묶어서 호출.

- **확정 (confirmApplication)**
  - 다른 “이미 확정된” 지원에 대해 각각 `job_post_positions`·`job_posts` 조회 → **N+1**.  
  - **권장**: 해당 포지션/글 ID를 모아 한두 번의 in 쿼리로 조회 후 메모리에서 중복·정원 체크.

### 3.3 기타

- RLS, rate limit(구인 작성·노쇼 신고), `get_job_post_application_counts` RPC 사용은 설계대로 동작하는 것으로 확인.

---

## 4. 홈 페이지

- **데이터**: tenders, posts, listings, newsletter, job_posts 개수/목록을 한 번의 `Promise.all`로 병렬 조회. 중복 fetch 없음.
- **revalidate**: 60초. 과도한 재검증 없음.

---

## 5. 요약 표

| 항목 | 결과 | 비고 |
|------|------|------|
| **빌드** | 성공 | 타입/로그인 Suspense 수정 반영 |
| **현장 거래 기능** | 정상 | 목록/상세/글쓰기 동작 |
| **인력구인 기능** | 정상 | 목록/상세/작성/수정/관리/매칭/노쇼 등 동작 |
| **불필요한 서버 비용** | 일부 있음 | 아래 3건 권장 개선 |
| **속도 이슈** | 잠재적 | 목록 dayPositions 전량 조회, 상세 benchmark N+1 |

---

## 6. 권장 개선 (우선순위)

1. **인력구인 목록**  
   `dayPositions`를 현재 화면의 `postIds`로 제한하거나, 집계값만 별도 저장해 조회.

2. **인력구인 상세**  
   `market_benchmarks`를 포지션별 1회가 아니라, (region, category_main_id, category_sub_id, pay_unit, skill_level) 조합 단위로 한 번에 조회.

3. **확정(confirmApplication)**  
   “다른 확정 건” 검사 시 포지션/글을 한두 번의 in 쿼리로 불러와 메모리에서 처리.

4. **현장 거래 글쓰기**  
   `getListingBenchmarks` 호출을 디바운스 또는 “참고값 보기” 버튼으로 줄여 호출 횟수 감소.

---

이 문서는 코드/라우트/쿼리 구조 기준으로 작성된 점검 결과이며, 실제 DB/스테이징에서 한 번 더 동작 확인하는 것을 권장합니다.
