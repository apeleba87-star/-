# 입찰 공고 업종·지역 필터 구현 계획

## 1. 목표

- **API**: 현재처럼 날짜 기준으로 전량 수집 (변경 없음).
- **필터 방식**: 키워드(청소/미화) 매칭이 아닌 **업종(건물위생관리업 등)** 기준으로 공고 필터.
- **지역**: 참가가능지역(bsns_dstr_nm)으로 **전체 / 특정 시·도** 선택 필터.
- **관리자**: 업종을 관리자 모드에서 추가·수정·비활성화.

---

## 2. DB 스키마

### 2.1 `industries` 테이블 (신규)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK, default gen_random_uuid() |
| code | TEXT | 나라장터 업종코드(또는 우리 식별자). UNIQUE. 예: `BUILDING_SANITATION` 또는 조달청 코드 |
| name | TEXT NOT NULL | 한글명. 예: 건물위생관리업 |
| sort_order | INT | 정렬 순서 (기본 0) |
| is_active | BOOLEAN | true=필터 옵션에 노출 (기본 true) |
| created_at, updated_at | TIMESTAMPTZ | |

- 인덱스: `(is_active)` where is_active = true, `(code)` unique.
- RLS: SELECT는 전체 허용(목록/필터용). INSERT/UPDATE/DELETE는 admin/editor만.

### 2.2 `tenders` 테이블 변경

- **industry_code** (TEXT, nullable) 추가.
  - API 응답의 업종 코드/명을 우리 `industries.code`와 매칭해 저장.
  - null이면 “업종 미분류”(필터 시 “전체”에만 노출하거나, 별도 “미분류” 옵션).
- 기존 **categories**(TEXT[])는 단계적으로 제거하거나, **레거시/키워드 보조**로만 유지 후, 목록·필터는 **industry_code** 기준으로 전환.

### 2.3 마이그레이션 파일

- `supabase/migrations/039_tender_industries.sql`:
  - `industries` 테이블 생성.
  - `tenders`에 `industry_code` 컬럼 추가.
  - 인덱스: `tenders(industry_code)` (필터 쿼리용).
  - 초기 데이터: 건물위생관리업 등 1~2건 INSERT (code/name은 나라장터·실제 API 응답 확인 후 맞춤).
  - RLS 정책: industries 읽기 전체, 쓰기 admin/editor.

---

## 3. API 응답에서 업종 추출

### 3.1 확인할 raw 필드

공공데이터포털 입찰공고 API 응답 item에 업종이 있다면 보통 다음 중 하나일 가능성이 큼:

- `indstryCd`, `indstryNm` (업종코드, 업종명)
- `prcureObjCd`, `prcureObjNm` (계약대상 코드/명 — 업무 구분에 업종 포함될 수 있음)
- 한글: `업종코드`, `업종명`

실제 수집 데이터의 `raw` 한두 건을 로그로 찍어 확인한 뒤, 있는 필드로 매핑.

### 3.2 매핑 전략

- **방법 A**: 응답에 업종코드/업종명이 있으면  
  - `mapper.ts`에서 `industry_code`(또는 `industry_name`) 추출.  
  - `industries` 테이블에 같은 code/name이 있으면 그 `code`를 tenders.industry_code에 저장.  
  - 없으면 code 그대로 저장하거나 null (나중에 관리자가 해당 업종 추가 후 백필).
- **방법 B**: 응답에 업종이 없으면  
  - 당분간 `industry_code`는 null.  
  - 기존처럼 키워드/카테고리로 “대략 업종” 매핑해 두고, 관리자가 수동으로 업종 매핑 규칙을 넣거나, 나중에 API 스펙이 바뀌면 적용.

---

## 4. 수집 파이프라인 변경 (fetch-tenders)

### 4.1 mapper.ts

- `mapItemToTender` 인자에 `row` 그대로 두고, 반환 객체에 **industry_code** (또는 industry_name) 추가.
- raw에서 업종 후보 필드 순서대로 조회:
  - `indstryCd` → code로 사용.
  - 없으면 `indstryNm` → name으로 사용 후, industries에서 name으로 code 조회하거나 그대로 code처럼 저장(정책에 따라).
- `raw`는 기존처럼 통째로 저장.

### 4.2 fetch-tenders.ts

- **키워드/clean_score 기반 categories 계산**은 제거하거나, “레거시/보조”용으로만 유지.
- 각 item 매핑 후:
  - mapper에서 나온 `industry_code`(또는 name)로 DB의 `industries`와 매칭:
    - code가 있으면 → tenders.industry_code = code.
    - name만 있으면 → industries.name으로 조회해 code 설정.
  - 매칭 실패 시: industry_code = null 또는 “미분류” 같은 고정 코드 하나 두기.
- upsert 시 **industry_code** 포함.

### 4.3 백필(선택)

- 기존 tenders 행에 대해 `raw`에서 업종 다시 추출해 `industry_code` 채우는 스크립트 또는 `/api/admin/backfill-tender-industry` 같은 API.
- 한 번만 실행하거나, 관리자 화면에서 “업종 백필” 버튼으로 실행.

---

## 5. 관리자 — 업종 CRUD

### 5.1 라우트·파일

- `app/admin/industries/page.tsx`: 목록 + 폼(추가/수정).
- `app/admin/industries/actions.ts`: create, update, delete (또는 is_active 비활성화).
- `components/admin/IndustriesManager.tsx` 또는 폼 컴포넌트: 테이블 + 모달/인라인 편집.

참고: `app/admin/tender-keywords/` 구조를 그대로 따라가면 됨.

### 5.2 기능

- **목록**: code, name, sort_order, is_active, 수정/비활성화 버튼.
- **추가**: code(중복 불가), name 입력 후 INSERT.
- **수정**: name, sort_order, is_active 변경.
- **삭제**: 실제 DELETE 또는 is_active = false (필터 옵션에서만 제외, 기존 tenders.industry_code는 유지).

### 5.3 네비게이션

- 관리자 사이드바/헤더에 “입찰 키워드” 옆에 “업종 관리” 링크 추가 (`/admin/industries`).

---

## 6. 입찰 목록·필터 UI (사용자)

### 6.1 데이터 흐름

- **옵션 A (현재와 동일)**: 서버에서 tenders 전부(또는 상위 N건) 내려주고, 클라이언트에서 업종·지역 필터 + 정렬.
- **옵션 B**: 쿼리 파라미터 `industry`(code), `region`(시도) 받아 서버에서 필터링 후 목록만 내려줌. (나중에 건수가 많아지면 B로 전환 권장.)

당장은 **옵션 A**로 구현해도 됨:  
`/tenders`에서 tenders + **industries** 목록(is_active만)을 같이 내려주고, 클라이언트에서 industry_code·bsns_dstr_nm(parseRegionSido) 기준 필터.

### 6.2 tenders 페이지 (app/tenders/page.tsx)

- 기존: `overlaps("categories", ["cleaning", "disinfection"])` 등으로 조회.
- 변경:
  - **industry_code 필터 제거**하고, 기한·정렬만 적용해 목록 조회 (또는 “활성 업종에 해당하는 공고만” 등 정책에 따라 제한).
  - `industries` 테이블에서 `is_active = true` 목록 select 해서 페이지에 전달.
- TendersListWithFilters에 **tenders**, **industries** props 전달.

### 6.3 TendersListWithFilters.tsx

- **업종 필터**:
  - “전체” + 관리자 등록 업종 목록(industries)을 라디오/드롭다운/다중 선택으로 표시.
  - 선택값: `"all"` 또는 `industry_code`(단일) 또는 `industry_code[]`(다중).
  - 필터 로직: `selected === "all"` 이면 전부 통과; 아니면 `tender.industry_code`가 선택한 code(또는 배열에 포함)인 것만 표시.
- **지역 필터**:
  - 기존처럼 “전체 지역” + 시·도 목록(REGION_OPTIONS).
  - `bsns_dstr_nm`에 대해 `parseRegionSido`로 시·도 추출해, 선택한 지역과 일치하는지 비교.
- **정렬**: 기존 유지(최신순, 마감일순, 금액 순).

### 6.4 카드/상세 표시

- TenderBidCard 등에서 “업종” 표기: `tender.industry_code` → industries에서 name 조회해 “건물위생관리업” 등 한글로 표시.
- 목록에서 industry_code가 null인 공고는 “업종: —” 또는 “미분류”로 표시할지 정책 결정.

---

## 7. 사용자 “내 업종” / “내 지역” (선택)

- **내 업종**: 로그인 사용자가 “관심 업종”을 프로필(예: profiles 또는 worker_profiles)에 1~N개 저장해 두고, 입찰 목록 진입 시 **기본 필터**를 “내 업종”으로 두는 방식.
- **내 지역**: 동일하게 프로필에 “선호 지역”(시·도) 저장 후, 기본값을 “내 지역”으로 두는 방식.
- 구현 단계: 1차에는 **필터만** 업종/지역 선택 가능하게 하고, 2차에 프로필 필드 + 기본값 로직 추가해도 됨.

---

## 8. 일간 리포트·홈 노출

- “오늘 청소 입찰” 등으로 쓰는 데이터가 **tenders** 쿼리라면, 해당 쿼리에도 **industry_code IN (활성 업종 코드)** 또는 “건물위생관리업 등 특정 업종만” 조건 추가.
- 지역은 “전체”로 두거나, 리포트용으로는 기존처럼 전국 기준 유지해도 됨.

---

## 9. 구현 순서 요약

1. **마이그레이션**: industries 테이블, tenders.industry_code, 인덱스, RLS, 초기 데이터.
2. **raw 확인**: 수집 1회 돌린 뒤 raw 한 건 로그로 확인 → 업종 필드명 확정.
3. **mapper**: raw에서 업종 추출해 industry_code(또는 name) 세팅.
4. **fetch-tenders**: industry_code 매핑·저장, (선택) 기존 categories 로직 축소/제거.
5. **관리자**: /admin/industries CRUD.
6. **tenders 페이지**: industries 목록 조회, TendersListWithFilters에 전달.
7. **TendersListWithFilters**: 업종 필터(전체 + 업종 목록), 지역 필터 유지, industry_code 기준 필터링.
8. **카드/상세**: 업종 한글명 표시.
9. (선택) 백필 API, 프로필 “내 업종/내 지역”, 리포트 쿼리 industry 조건.

이 순서대로 하면 “API는 그대로 두고, 수집본을 업종으로 저장·필터”하는 구조로 전환할 수 있고, 업종 등록은 앞으로도 관리자 모드에서만 늘려나가면 됨.
