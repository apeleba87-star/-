# 업종제한사항 데이터 소스 정리

나라장터 화면의 **입찰자격 → 업종제한 / 업종제한사항** (예: `[건물위생관리업(1162)] 업종을 등록한 업체`)에 대응하는 API를 정리한 문서입니다.

---

## 1. 화면과 API 대응

| 화면 | 설명 | API 후보 |
|------|------|----------|
| **업종제한** | "투찰제한" 등으로 표시, 허용 업종(예: 건물위생관리업 1162) | 상세 API / 면허제한 API |
| **업종제한사항** 테이블 | 두찰가능한업종, 허용업종 등 (공고서참조) | 동일 데이터를 상세 API에서 반환할 가능성 높음 |

화면에는 "면허제한"이 아니라 **"업종제한"·"업종제한사항"**으로 노출됩니다. 데이터는 아래 두 API 중 하나(또는 둘 다)에서 올 수 있습니다.

---

## 2. 후보 API

### A. 용역 입찰공고 상세정보 (업종제한에 직접 대응)

- **오퍼레이션**: `getBidPblancListInfoServcDtlInfo`
- **파일**: `lib/g2b/client.ts` — 이미 구현됨
- **용도**: 주석에 **"입찰제한·업종제한 등"** 포함이라고 명시됨
- **호출**: 공고번호·차수 기준 1건 조회 (`bidNtceNo`, `bidNtceOrd`)
- **참고**: 공공데이터포털 25개 오퍼레이션에 없을 수 있어 404가 나면 대체 base URL·3자리 차수로 재시도하도록 되어 있음. **업종제한사항**은 이 상세 API 응답에 포함되어 있을 가능성이 큼.

### B. 면허제한정보

- **오퍼레이션**: `getBidPblancListInfoLicenseLimit` / `getBidPblancListInfoLicenseLimitByRange`
- **파일**: `lib/g2b/client.ts`
- **용도**: "면허제한정보" — 응답에 업종 코드·면허명 등이 포함될 수 있음
- **현재**: 수집 플로우에서 **이 API만** 사용 중. 키 매칭 이슈로 DB 반영 0건이 나온 적 있음.

---

## 3. 파싱 공통

`lib/g2b/industry-from-detail.ts`의 `parseIndustryRestrictionsFromDetailResponse`는 **상세 API·면허제한 API 둘 다** 같은 형태로 처리합니다.

- **코드 필드**: `indstryCd`, `업종코드`, `industryCd` 등
- **명칭 필드**: `입찰제한업종`, `제한업종`, `업종명`, `면허명`, `제한면허`, `허용업종목록` 등
- **형식**: `건물위생관리업(1162)`, `건물위생관리업/1162` 파싱 지원

즉, **업종제한사항**을 가져오는 소스를 "면허제한 API"에서 **"상세 API(ServcDtlInfo)"**로 바꿔도 기존 파서를 그대로 쓸 수 있습니다.

---

## 4. 권장 방향

1. **업종제한사항 = 상세 API 우선 시도**
   - 수집 시 또는 백필 시 `getBidPblancListInfoServcDtlInfo(공고번호, 차수)` 호출
   - 응답을 `parseIndustryRestrictionsFromDetailResponse`에 넣어 업종 추출 → `tender_industries` / `primary_industry_code` 반영
   - 상세 API가 404이거나 응답에 업종 필드가 없으면, 기존처럼 **면허제한 API**로 fallback

2. **면허제한 API**
   - 현재처럼 기간/공고별 조회 후 키 매칭으로 반영. 키 정규화·동일 구간 사용 등으로 매칭률 개선 후에도 0건이면, 상세 API를 주 소스로 쓰는 전환 검토.

3. **공공데이터포털**
   - [조달청_나라장터 입찰공고정보서비스](https://www.data.go.kr/data/15129394/openapi.do) 상세 문서·참고자료에서 "용역 입찰공고 상세정보" 응답 필드명(업종제한/업종제한사항 대응 필드)을 확인하면 필드 매핑을 더 정확히 할 수 있음.
   - "업종제한사항" 전용 오퍼레이션명은 검색 결과에 없었고, **상세정보** 오퍼레이션에 포함되는 구조로 보는 것이 타당함.

---

## 5. 관련 파일

| 파일 | 역할 |
|------|------|
| `lib/g2b/client.ts` | `getBidPblancListInfoServcDtlInfo`, `getBidPblancListInfoLicenseLimit(ByRange)` |
| `lib/g2b/industry-from-detail.ts` | 업종제한/면허 응답 파싱, `parseIndustryRestrictionsFromDetailResponse` |
| `lib/g2b/fetch-tenders.ts` | 수집 시 면허제한 API 호출·키 매칭·업종 반영 (상세 API 연동 시 여기서 ServcDtlInfo 호출 추가 가능) |
| `docs/implementation-plan-industry-from-detail-api.md` | 입찰제한(업종제한) 기반 업종 매핑 전체 계획 |
