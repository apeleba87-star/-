# 입찰제한(업종제한) 기반 업종 매핑 구현 계획

## 1. 목표

- **현재**: 목록 API(`getBidPblancListInfoServc`) 응답의 `raw`에서 업종을 추론(코드/이름 직접 매칭 또는 공고명·상세 텍스트 기반 추정).
- **목표**: 나라장터 상세 페이지의 **입찰제한**에 노출되는 **업종별 참가자격**(예: `[건물위생관리업 (1162)]`)을 **권위 데이터**로 사용해 업종을 확정.

즉, “입찰제한 사항”에 명시된 업종 코드/이름을 API로 가져와 `tender_industries`·`primary_industry_code`에 반영하는 흐름을 만든다.

---

## 2. 전제 및 제약

| 항목 | 내용 |
|------|------|
| 데이터 소스 | 나라장터 입찰공고 **상세** 정보(입찰제한·업종제한) |
| API | 공공데이터포털 **입찰공고정보서비스** 내 “용역 입찰공고 **상세**” 오퍼레이션 (정확한 오퍼레이션명은 API 문서/실측으로 확정) |
| 호출 제한 | 개발 1,000회/일 등 트래픽 제한 존재 → 상세 API는 “필요한 공고만” 호출하는 전략 필요 |
| 기존 구조 | `tenders`, `tender_industries`, `tender_details(raw)`, `industries` 유지 |

---

## 3. API 조사 (Phase 0)

### 3.1 확인할 사항

1. **목록 API에 업종제한 포함 여부**
   - `getBidPblancListInfoServc` 응답(또는 `raw`에 저장된 필드)에  
     `indstryCd` / `indstryNm` / `업종제한` / `입찰제한` 등이 이미 있는지 확인.
   - 있으면: 상세 API 호출 없이 목록 수집 시점에만 파싱하면 됨(구현 단순, 호출 수 증가 없음).
   - 없으면: 아래 “상세 API” 사용이 필수.

2. **상세 API 오퍼레이션명·파라미터**
   - 공공데이터포털 “조달청_나라장터 입찰공고정보서비스” 상세 문서에서  
     **용역 입찰공고 상세정보** 조회 오퍼레이션 확인.
   - 예상 이름(실제는 문서 기준): `getBidPblancListInfoServcDtlInfo` 또는 유사.
   - 필수 파라미터: `bidNtceNo`, `bidNtceOrd` (공고번호·차수).

3. **상세 응답 내 업종제한 필드**
   - 응답 XML/JSON에서 “입찰제한”·“업종제한”에 해당하는 필드명 확인.
   - 예: `indstryCd`, `indstryNm`, `prcureObjCd`, `업종별등록업체` 등 (실제 필드명은 응답 샘플로 확정).
   - 형식: 코드 4자리(예: 1162) + 업종명(예: 건물위생관리업) 조합이 한 건인지, 여러 업종이 배열인지 확인.

### 3.2 산출물

- [ ] 목록 API `raw` 샘플에서 업종 관련 필드 유무 정리.
- [ ] 상세 API 오퍼레이션명·URL·파라미터·응답 샘플(JSON/XML) 문서 또는 코드 주석으로 정리.
- [ ] 업종제한 추출 시 사용할 **필드 경로**와 **파싱 규칙** (코드/이름 매핑, 다중 업종 처리).

---

## 4. 아키텍처 개요

```
[목록 API] → tenders upsert + (기존) raw 기반 업종 추정
                    ↓
        (선택) 상세 API 호출 (미분류/추정만 또는 전량 제한 호출)
                    ↓
        업종제한 파싱 → industries와 매칭 → tender_industries 갱신
                    ↓
        tender_details.raw 에 상세 원문 저장 (재호출 최소화)
```

- **우선순위**: 상세 API에서 나온 “입찰제한 업종”이 있으면, 기존 `direct_code`/`direct_name`/`alias`/`text_estimated`보다 **우선**하여 사용.
- **match_source**: 상세 API 기반 매칭은 새 값 `detail_api` 추가 (DB/타입 반영).

---

## 5. 상세 구현 단계

### Phase 1: 상세 API 클라이언트 추가

**파일**: `lib/g2b/client.ts` (및 필요 시 `lib/g2b/types.ts`)

1. **오퍼레이션 추가**
   - 공공데이터포털 문서에 맞는 **용역 입찰공고 상세** 오퍼레이션 호출 함수 추가.
   - 예: `getBidPblancListInfoServcDtlInfo(params: { bidNtceNo: string; bidNtceOrd: string })`.
   - 기존 `buildUrl`, `parseResponse`, `G2B_FETCH_OPTIONS` 재사용.
   - Base URL은 기존 목록/참가가능지역과 동일한 서비스 사용 (필요 시 `BidPublicInfoService02` 등 문서 기준).

2. **응답 타입**
   - 상세 응답에서 사용할 최소 타입 정의 (예: `response.body.items.item` 또는 `response.body.item`).
   - 업종제한 관련 필드만 골라서 타입에 넣어 두기 (예: `industryCode`, `industryName` 또는 한글 필드명).

3. **에러·빈값 처리**
   - 200이 아니거나 body가 비어 있으면 빈 객체/배열 반환 또는 명시적 에러.
   - 타임아웃(기존 5초) 유지.

**산출물**: `getBidPblancListInfoServcDtlInfo`(또는 확정된 오퍼레이션명) 및 공통 `extractItems`로 상세 1건 조회 가능.

---

### Phase 2: 상세 응답에서 업종제한 파싱

**파일**: `lib/g2b/industry-from-detail.ts` (신규 권장) 또는 `lib/g2b/industry-from-raw.ts` 확장

1. **파서 함수**
   - 입력: 상세 API 응답 객체 (또는 이미 저장된 `tender_details.raw`).
   - 출력: `{ code?: string; name?: string }[]` (또는 기존 `IndustryMatch` 형태에 `match_source: "detail_api"`).
   - 실제 응답 필드명에 맞춰 코드/이름 추출 (예: `indstryCd`/`indstryNm`, 또는 한글 키).
   - 여러 업종이면 배열로 반환.

2. **industries와 매칭**
   - `code`가 있으면 `industries`에서 코드로 매칭.
   - `name`만 있으면 기존 `matchIndustryByNameOrAlias`와 유사하게 이름/별칭 매칭.
   - 매칭된 것만 `tender_industries`에 넣고, `match_source = 'detail_api'` 로 저장.

3. **대표 업종**
   - 기존 `pickPrimaryIndustryCode` 그대로 사용하여 `primary_industry_code` 결정.

**산출물**: `parseIndustryRestrictionsFromDetailResponse(detailRaw): IndustryMatch[]` (또는 동일 목적 함수).

---

### Phase 3: DB·타입 반영

1. **match_source 값 추가**
   - `tender_industries.match_source`: `'detail_api'` 추가.
   - 마이그레이션: `COMMENT ON COLUMN ...` 등으로 문서화만 해도 되고, CHECK 제약이 있다면 허용 값 추가.

2. **tender_details 활용**
   - 상세 API 응답을 `tender_details.raw`에 저장 (이미 `raw JSONB` 있음).
   - `tender_id` 기준 1건이므로 `ON CONFLICT (tender_id) DO UPDATE SET raw = ..., updated_at = ...`.

3. **선택: industry_match_status**
   - 상세 API로 확정된 경우 `tenders.industry_match_status = 'matched'` 또는 새 값 `'detail_api'` 로 구분해도 됨 (필요 시).

**산출물**: 마이그레이션 파일(필요 시), `tender_industries`/`tenders` 스키마·주석 반영.

---

### Phase 4: 호출 시점 전략 (언제 상세 API를 부를지)

| 전략 | 설명 | 장점 | 단점 |
|------|------|------|------|
| A. 수집 시 전량 | 목록 수집 직후, 공고별로 상세 1회 호출 | 모든 공고가 상세 기준 업종 보유 | API 호출 수 = 공고 수, 트래픽·지연 큼 |
| B. 수집 시 제한량 | 목록 수집 후 N건만 상세 호출 (예: 최신 100건) | 트래픽 제어 용이 | 나머지는 기존 raw 추정 유지 |
| C. 백필만 | 기존 백필과 동일하게, 미분류(`primary_industry_code IS NULL`) 또는 `text_estimated`만 상세 호출 | 호출 수 최소 | 수집 당일 공고는 당일에는 추정만 가능 |
| D. 하이브리드 | 수집 시에는 raw만 저장; 백필/배치에서 “미분류 + text_estimated”만 상세 호출 후 갱신 | 정확도·비용 균형 | 구현 복잡도 소폭 증가 |

**권장**: **D. 하이브리드**
- 목록 수집: 기존처럼 목록 API만 사용, raw 기반 추정으로 `tender_industries`·`primary_industry_code` 1차 반영.
- 별도 배치(또는 백필 확장): `primary_industry_code IS NULL` 또는 `industry_match_status = 'text_estimated'` 인 건만 상세 API 호출.
- 상세 호출 시 1) `tender_details` upsert, 2) 업종제한 파싱 → `tender_industries` 갱신, `primary_industry_code` 갱신.

**호출 수 제한**
- 일일 상한(예: 500건) 두고, 백필/배치에서 상세 호출 건수를 제한.
- 이미 `tender_details.raw`가 있고, 그 안에 업종제한 필드가 있으면 **재호출 생략** (같은 tender_id에 대해 상세 재조회 안 함).

---

### Phase 5: 백필/배치 로직

**파일**: `app/api/admin/backfill-tender-industries/route.ts` 확장 또는 `app/api/cron/backfill-tender-detail-industries/route.ts` 신규

1. **대상 선정**
   - `tenders` 중 `primary_industry_code IS NULL` 또는 `industry_match_status IN ('unclassified', 'text_estimated')`.
   - 이미 `tender_details.raw`가 있고, 여기서 업종제한 파싱이 성공한 건은 제외(또는 “상세 기반 재계산” 옵션으로만 재처리).

2. **순회**
   - 대상 수가 많으면 페이지네이션 (예: 100건씩).
   - 건당: 상세 API 호출 → `tender_details` upsert → `parseIndustryRestrictionsFromDetailResponse` → `tender_industries` 갱신, `tenders.primary_industry_code` 등 갱신.
   - 일일 상한 도달 시 중단하고, 다음 cron/수동 실행에서 이어서 처리 가능하도록 (또는 “다음 배치” 메시지 반환).

3. **진행률**
   - 기존 백필처럼 스트리밍(NDJSON) 또는 폴링 가능한 progress API 유지.

4. **에러 처리**
   - 상세 API 4xx/5xx: 해당 건 스킵, 로그만 남기고 다음 건 진행.
   - 파싱 실패: 해당 건은 기존 raw 추정 결과 유지.

---

### Phase 6: 수집 파이프라인 연동 (선택)

**파일**: `lib/g2b/fetch-tenders.ts`

- **옵션 1**: 수집 시 상세 호출 안 함 (현재와 동일). 업종은 백필/배치에서만 상세 기반 반영.
- **옵션 2**: 환경 변수 또는 `app_settings`로 “수집 시 상세 호출” on/off. on일 때만, 당일 수집 건 중 상위 N건에 대해 상세 API 호출 후 즉시 `tender_industries`·`tender_details` 반영.
- 권장: 우선 **옵션 1**으로 두고, 트래픽 여유가 생기면 옵션 2를 제한적으로 도입.

---

### Phase 7: UI·운영

1. **관리자**
   - 업종 백필 화면에서 “상세 API 기반 백필” 버튼 또는 “미분류만 상세 조회” 옵션 추가.
   - 진행률·성공/스킵/에러 건수 표시.

2. **카드/상세 노출**
   - `match_source = 'detail_api'` 인 업종이 있으면, “입찰제한 기준” 등으로 배지/툴팁 노출 가능 (선택).

3. **모니터링**
   - 일일 상세 API 호출 횟수 로그 또는 `app_settings`/별도 테이블에 집계 저장해 트래픽 한도 관리.

---

## 6. 작업 순서 요약

| 순서 | 단계 | 내용 |
|------|------|------|
| 1 | Phase 0 | API 조사: 목록 raw 업종 필드 유무, 상세 오퍼레이션명·응답 구조 확정 |
| 2 | Phase 1 | 상세 API 클라이언트 함수 추가 (`client.ts`) |
| 3 | Phase 2 | 상세 응답 파서 및 industries 매칭 (`industry-from-detail.ts` 등) |
| 4 | Phase 3 | DB: `match_source` 값 `detail_api` 추가, `tender_details.raw` 저장 규칙 |
| 5 | Phase 4 | 호출 전략 확정 (하이브리드 권장) |
| 6 | Phase 5 | 백필/배치: 미분류·text_estimated 대상 상세 호출 및 갱신 |
| 7 | Phase 6 | (선택) 수집 시 상세 호출 옵션 |
| 8 | Phase 7 | 관리자 UI·모니터링 |

---

## 7. 리스크·대안

- **상세 API가 없거나 응답에 업종제한이 없음**: 문서 재확인 또는 공공데이터포털 문의. 그동안은 기존 raw/텍스트 추정 유지.
- **트래픽 초과**: 일일 상한·백필 배치 크기 줄이기; “미분류만” 우선 처리로 호출 수 최소화.
- **응답 지연**: 상세 호출을 비동기 큐로 돌리고, 결과만 DB에 반영하는 방식 검토 (구현 규모 커지면 2단계로).

이 계획서는 “입찰제한(업종제한) 데이터로 업종을 뽑아 반영한다”는 요구에 맞춘 상세 구현 계획이며, Phase 0 API 조사 결과에 따라 오퍼레이션명·필드명만 최종 확정하면 된다.

---

## 8. 현재 상태 (상세 API 404 대응)

- **상세 API 호출 시 404**: 공공데이터포털 나라장터 입찰공고정보서비스(API ID 15129394)에서 `getBidPblancListInfoServcDtlInfo` 오퍼레이션이 존재하지 않거나 다른 이름으로 제공될 수 있음.
- **대응**: 공공데이터포털 해당 API 상세 페이지 참고자료(Word/PDF)에서 25개 오퍼레이션 목록을 확인한 뒤, "용역 입찰공고 상세정보"에 해당하는 정확한 영문 오퍼레이션명을 찾아 `lib/g2b/client.ts`에서 오퍼레이션명을 교체해야 함.
- 그동안 업종 매핑은 목록 API raw 기반 추정만 사용 가능하며, "기존 공고 업종 백필 (미분류만)"으로 보완 가능.
