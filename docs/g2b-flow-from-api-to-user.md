# 나라장터(G2B) API 수집 → 사용자 노출까지 전체 흐름

## 개요

1. **트리거**: 관리자 수동 버튼 또는 Cron이 나라장터 API를 호출한다.
2. **API 호출**: 공공데이터포털 입찰공고정보서비스(용역) 목록 API를 날짜 구간으로 페이지네이션 호출한다.
3. **응답 파싱**: XML/JSON 응답을 파싱해 `item` 배열을 꺼낸다.
4. **매핑·보강**: 각 item을 `tenders` 테이블 형식으로 변환하고, 업종 코드 추출·키워드 매칭(선택)을 적용한다.
5. **저장**: `tenders` upsert + `tender_industries` 삽입, 체크포인트 기록.
6. **노출**: 사용자가 `/tenders` 목록·필터와 `/tenders/[id]` 상세에서 DB 데이터를 본다.

---

## 1. 트리거 (수집을 누르는 시점)

### 1-1. 관리자 수동 수집

- **경로**: 관리자 대시보드 → G2B 수집 버튼 (또는 직접 `POST /api/admin/fetch-g2b` 호출)
- **파일**: `app/admin/G2bFetchButton.tsx` → `POST /api/admin/fetch-g2b?stream=1`
- **API**: `app/api/admin/fetch-g2b/route.ts`
  - 로그인 + `profiles.role` 이 `admin` 또는 `editor` 인지 확인
  - `DATA_GO_KR_SERVICE_KEY` 환경변수 없으면 400 반환
  - `?stream=1` 이면 NDJSON 스트리밍으로 진행률 전송, 아니면 일반 JSON 응답
  - 내부에서 `runTenderFetch({ daysBack: 1, onProgress })` 호출

### 1-2. Cron 자동 수집

- **경로**: Vercel Cron 등에서 `POST /api/cron/fetch-g2b` 호출 (헤더 `x-cron-secret` 검증)
- **파일**: `app/api/cron/fetch-g2b/route.ts`
  - `CRON_SECRET` 이 있으면 헤더와 일치해야 200 처리
  - `DATA_GO_KR_SERVICE_KEY` 가 있으면 `runTenderFetch({ daysBack: 1 })` 실행
  - 없으면 스텁 1건만 `tenders` 에 upsert (개발용)

---

## 2. API 호출 (실제 나라장터 요청)

### 2-1. 진입점: `runTenderFetch`

- **파일**: `lib/g2b/fetch-tenders.ts`
- **역할**:
  - 조회 기간 계산: `getDateRange(daysBack)` → `inqryBgnDt`, `inqryEndDt` (YYYYMMDDHHmm)
  - `app_settings` 에서 **입찰 키워드 사용 여부** 조회 (`getTenderKeywordsEnabled`)
  - 사용 시: `getTenderKeywordOptionsByCategory()` 로 DB `tender_keywords` 로드
  - 비사용 시: 빈 키워드 옵션으로 키워드 매칭·categories 미적용
  - `industries` 테이블에서 `is_active = true` 인 업종 목록 로드 (code, name, aliases)
  - **용역(Servc)** 만 사용: `fetchOperation("Servc", range, ...)` 1회 호출

### 2-2. 목록 API 호출: `fetchOperation` → `getBidPblancListInfoServc`

- **파일**: `lib/g2b/client.ts`
- **API 엔드포인트**:  
  `https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc`
- **요청 파라미터**:
  - `serviceKey`: `DATA_GO_KR_SERVICE_KEY` (Encoding 인증키, URL에 직접 붙임)
  - `returnType`: json
  - `pageNo`, `numOfRows`: 1, 100 (한 페이지 100건)
  - `inqryBgnDt`, `inqryEndDt`: 조회 기간 (예: 전일 00:00 ~ 오늘 23:59)
  - `inqryDiv`: 1 (등록일 기준)
- **HTTP 요청**: `safeFetch(url, { allowedHosts: G2B_ALLOWED_HOSTS, timeoutMs: 5000 })`
  - `lib/safe-fetch.ts`: 허용 host(g2b.go.kr, apis.data.go.kr 등)만 요청, 5초 타임아웃 → **SSRF 방지**
- **응답**: 서버가 XML 또는 JSON 반환 가능
  - `parseResponse(text)`: XML이면 `fast-xml-parser`로 파싱, 아니면 JSON.parse
  - 구조: `response.body.items.item` (또는 `response.body.item`) → **item 배열**
- **페이지네이션**: 100건씩 받을 때까지 `pageNo` 를 올리며 반복 (최대 50페이지)

### 2-3. item 배열 꺼내기: `extractItems`

- **파일**: `lib/g2b/client.ts`
- **입력**: API 파싱 결과 `G2BListResponse<T>`
- **출력**: `response.body.items.item` 또는 `body.item` 을 배열로 정규화 (단일 item이면 1칸 배열)

---

## 3. 매핑·보강 (API item → DB 행 + 업종/키워드)

### 3-1. 기본 매핑: `mapItemToTender`

- **파일**: `lib/g2b/mapper.ts`
- **입력**: API item 한 건 (한글/영문 필드명 혼용)
- **동작**:
  - `bidNtceNo` / `bid_ntce_no` / `공고번호` → `bid_ntce_no`
  - `bidNtceOrd` / `공고차수` → `bid_ntce_ord`
  - `bidNtceNm` / `공고명` → `bid_ntce_nm`
  - `bidNtceDt`, `bidClseDt`, `opengDt` → ISO 날짜 문자열
  - `ntceInsttNm` / `공고기관명` → `ntce_instt_nm`
  - `bsnsDstrNm` / `사업지역` / `참가가능지역` → `bsns_dstr_nm`
  - `bsisAmt` / `기초금액` / `추정가격` 등 → `base_amt` (숫자)
  - `ntce_url`: 나라장터 공고 상세 URL 생성
  - **원문 보존**: `raw: row` (API item 전체를 JSONB로 저장)
- **출력**: `tenders` 에 넣을 수 있는 평탄화 객체 (source 제외 후 upsert payload로 사용)

### 3-2. 키워드 매칭 (입찰 키워드 사용 시)

- **파일**: `lib/g2b/fetch-tenders.ts`, `lib/g2b/mapper.ts`
- **함수**: `matchKeywords(title, allIncludeKeywords)`  
  - 공고명에 포함/제외 키워드가 있으면 매칭
- **결과**: `keywords_matched` (매칭된 키워드 배열 또는 null)

### 3-3. 카테고리 점수 (입찰 키워드 사용 시)

- **파일**: `lib/g2b/clean-score.ts`, `lib/g2b/keywords.ts`
- **함수**: `computeCategoryScores(title, detailText, optionsByCategory)`
- **입력**: 공고명, 상세 텍스트(bidNtceDtl, prcureObjDtl, ntceSpecDocCn), DB 키워드 옵션(cleaning/disinfection include/exclude)
- **출력**: `["cleaning"]`, `["disinfection"]` 등
- **저장**: `categories`, `is_clean_related`, `clean_score`, `clean_reason`

### 3-4. 업종 코드 추출 (항상 수행)

- **파일**: `lib/g2b/industry-from-raw.ts`
- **함수**: `extractIndustryCodesFromRaw(raw, industries)`
- **입력**:
  - `raw`: API item 원문
  - `industries`: DB `industries` (code, name, aliases)
- **로직**:
  - raw에서 **코드 필드** 수집: `indstryCd`, `indstry_cd`, `업종코드`, `prcureObjCd` 등
  - raw에서 **명칭 필드** 수집: `indstryNm`, `업종명`, `prcureObjNm`, `계약대상` 등
  - 코드 값은 `industries.code` 와 직접 매칭
  - 명칭/쉼표·슬래시 구분 문자열은 `industries.name` / `aliases` 와 매칭
- **출력**: 매칭된 `industry.code` 배열 (중복 제거)
- **저장**:
  - `primary_industry_code`: 추출된 코드 배열의 첫 번째 값 (목록 카드용)
  - 나중에 배치에서 `tender_industries` 테이블에 (tender_id, industry_code) 다대다로 저장

---

## 4. 저장 (DB 반영)

### 4-1. tenders upsert

- **파일**: `lib/g2b/fetch-tenders.ts`
- **테이블**: `tenders`
- **방식**: 100건 단위로 `upsert(batch, { onConflict: "bid_ntce_no,bid_ntce_ord", ignoreDuplicates: false })`
- **반환**: `.select("id, bid_ntce_no, bid_ntce_ord")` 로 방금 upsert된 행의 `id` 취득

### 4-2. tender_industries 반영 (수집 시점)

- **테이블**: `tender_industries` (tender_id, industry_code)
- **동작**: upsert된 각 tender에 대해
  - 기존 `tender_industries` 행 삭제 (`delete().eq("tender_id", id)`)
  - 추출된 업종 코드마다 `insert({ tender_id, industry_code })`
- **결과**: 사용자가 업종(코드)으로 필터할 때 이 테이블로 조인해 목록을 좁힘

### 4-3. 체크포인트 기록

- **테이블**: `g2b_fetch_checkpoints`
- **행**: `(operation: "tender_list", inqry_bgn_dt, inqry_end_dt, last_fetched_at)`  
  - 수집한 날짜 구간과 마지막 수집 시각 보관

### 4-4. 캐시 무효화

- 수집 성공 시 `revalidatePath("/tenders")`, `revalidatePath("/")` 호출 → Next.js가 해당 경로 재생성

---

## 5. 사용자가 보는 경로 (노출)

### 5-1. 목록: `/tenders`

- **파일**: `app/tenders/page.tsx` (서버 컴포넌트)
- **데이터**:
  - `industries`: `industries` 테이블에서 `is_active = true`, `sort_order`/`code` 순
  - `tenders`: `tenders` 에서 `id`, `bid_ntce_no`, `bid_ntce_ord`, `bid_ntce_nm`, `ntce_instt_nm`, `bsns_dstr_nm`, `base_amt`, `bid_ntce_dt`, `bid_clse_dt`, `categories`, `raw`, `primary_industry_code`,  
    그리고 **join** `tender_industries(industry_code)`  
    정렬: `bid_clse_dt` 오름차(마감임박 먼저), 상한 500건
- **전달**: `TendersListWithFilters` 에 `tenders`, `industries` 전달

### 5-2. 필터·정렬·카드: `TendersListWithFilters`

- **파일**: `app/tenders/TendersListWithFilters.tsx` (클라이언트)
- **필터**:
  - **업종**: 사용자는 **업종명**(한글)으로 버튼 선택 → 내부 상태는 **업종 코드** 배열 `selectedIndustryCodes`
  - `industryMatch(tender, selectedIndustryCodes)`: tender의 `tender_industries[].industry_code` 가 선택 코드 중 하나라도 포함되면 통과
  - **지역**: `bsns_dstr_nm` 등에서 파싱한 시도(서울, 경기 등)와 선택 지역 비교
- **정렬**: 최신순 / 마감일순 / 금액 높·낮은순
- **표시**: `TenderBidCard` 에 tender + `industryNames` (code → name) 전달  
  → 카드에는 업종명으로 표시, 필터 로직은 전부 **코드** 기준

### 5-3. 카드 한 장: `TenderBidCard`

- **파일**: `components/tender/TenderBidCard.tsx`
- **표시**: 공고명, 기관명, 지역, 예산, D-Day, 업종(업종명), 분야(categories), 나라장터 링크 등

### 5-4. 상세: `/tenders/[id]`

- **파일**: `app/tenders/[id]/page.tsx`
- **데이터**:
  - URL의 `id` 로 `tenders` 1건 조회 (필요 시 `tender_industries`, `industries` 조인)
  - **추가 API 호출**(상세 보강):
    - `getBidPblancListInfoEorderAtchFileInfo`: e발주 첨부파일 목록
    - `getBidPblancListInfoServcBsisAmount`: 기초금액 상세 (base_amt 없을 때)
    - `getBidPblancListInfoPrtcptPsblRgn`: 참가가능지역 (지역 없을 때)
- **표시**: `TenderBidSummary`, `TenderBidStrategy`, `TenderBidSchedule`, `TenderBidExtraInfo`, 첨부 다운로드 링크 등

---

## 6. 기존 공고에 업종 반영: 백필

- **트리거**: 관리자 → 업종 관리 → "기존 공고 업종 백필" 버튼 → `POST /api/admin/backfill-tender-industries`
- **파일**: `app/api/admin/backfill-tender-industries/route.ts`
- **동작**:
  - 이미 DB에 있는 `tenders` 를 100건씩 읽고, `raw` 만으로 `extractIndustryCodesFromRaw` 호출
  - 배치 단위로 `tender_industries` DELETE → INSERT, `tenders.primary_industry_code` UPDATE
- **역할**: 과거 수집분 또는 API에 업종 정보가 없었던 공고에, 나중에 정의한 `industries` 기준으로 업종을 채우기 위함.

---

## 7. 요약 다이어그램 (데이터 흐름)

```
[관리자/Cron]
      │
      ▼
POST /api/admin/fetch-g2b  또는  POST /api/cron/fetch-g2b
      │
      ▼
runTenderFetch()
  ├─ getDateRange(1)           → inqryBgnDt, inqryEndDt
  ├─ getTenderKeywordsEnabled  → app_settings
  ├─ industries (DB)           → 업종 코드/이름/별칭
  ├─ getTenderKeywordOptions   → (키워드 사용 시) tender_keywords
  │
  ▼
fetchOperation("Servc", range, ...)
  │
  ├─ getBidPblancListInfoServc({ pageNo, numOfRows:100, inqryBgnDt, inqryEndDt })
  │     → safeFetch(공공데이터포털 URL)  [SSRF 방지, 5초 타임아웃]
  │     → parseResponse (XML/JSON) → extractItems() → item[]
  │
  ├─ for each item:
  │     mapItemToTender(item)           → 기본 필드 + raw
  │     matchKeywords(title)            → keywords_matched (키워드 사용 시)
  │     computeCategoryScores(...)     → categories (키워드 사용 시)
  │     extractIndustryCodesFromRaw()  → industry codes[]
  │     primary_industry_code = codes[0]
  │
  ▼
supabase.from("tenders").upsert(batch, onConflict: bid_ntce_no,bid_ntce_ord)
  .select("id, bid_ntce_no, bid_ntce_ord")
  │
  ├─ for each upserted row:
  │     tender_industries.delete(tender_id)
  │     tender_industries.insert([{tender_id, industry_code}, ...])
  │
  ├─ g2b_fetch_checkpoints.upsert(...)
  ▼
revalidatePath("/tenders"), revalidatePath("/")

────────────────────────────────────────────────────────────
[사용자]
      │
      ▼
GET /tenders  (또는 링크/새로고침)
  │
  ├─ industries (code, name)   → 필터 버튼·이름 표시
  ├─ tenders + tender_industries(industry_code)  → 목록
  ▼
TendersListWithFilters
  ├─ 필터: selectedIndustryCodes (코드), 지역
  ├─ industryMatch(tender, codes)  → tender_industries.industry_code
  ▼
TenderBidCard (업종명은 industryNames[code]로 표시)

GET /tenders/[id]
  ├─ tenders 1건 + 필요 시 상세 API (첨부, 기초금액, 참가지역)
  ▼
상세 컴포넌트들 (요약, 전략, 일정, 첨부 등)
```

---

## 8. 관련 환경변수·테이블

| 구분 | 이름 | 용도 |
|------|------|------|
| 환경변수 | `DATA_GO_KR_SERVICE_KEY` | 공공데이터포털 인증키(Encoding) |
| 환경변수 | `CRON_SECRET` | Cron 호출 시 헤더 검증 |
| 테이블 | `tenders` | 공고 기본 정보 + raw, primary_industry_code |
| 테이블 | `tender_industries` | tender_id ↔ industry_code 다대다 |
| 테이블 | `industries` | 업종 마스터 (code, name, aliases, sort_order) |
| 테이블 | `app_settings` | tender_keywords_enabled (키워드 사용 여부) |
| 테이블 | `tender_keywords` | 포함/제외 키워드 (키워드 사용 시) |
| 테이블 | `g2b_fetch_checkpoints` | 수집 구간·시각 기록 |

이 문서는 **나라장터 API를 불러온 뒤 사용자가 보기까지**의 전체 경로를 코드 기준으로 서술한 것입니다.
