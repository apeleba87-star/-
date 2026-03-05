# 나라장터(G2B) Open API MVP 설계

## 1. 오퍼레이션 → 용도·필드 매핑 표

### 1) 입찰공고정보서비스 (Base: `apis.data.go.kr/1230000/ad/BidPublicInfoService`)

| 오퍼레이션 | 용도 | 호출 시점 | 저장 테이블 | 주요 요청 파라미터 | 응답→저장 필드 매핑 |
|------------|------|-----------|-------------|---------------------|----------------------|
| **getBidPblancListInfoServc** | 용역 입찰 목록(청소·미화 등) | 크론 1차 수집 | tenders | pageNo, numOfRows, inqryBgnDt, inqryEndDt | 공고번호→bid_ntce_no, 공고명→bid_ntce_nm, 업무구분→bid_ntce_ord, 공고기관→ntce_instt_nm, 공고일시→bid_ntce_dt, 마감일시→bid_clse_dt, 개찰일시→openg_dt, 계약방법→cntrct_mthd_nm, 기초금액(있으면) 등 |
| **getBidPblancListInfoCnstwk** | 공사 입찰 목록 | 크론 1차 수집 | tenders | 동일 | 동일 구조 |
| **getBidPblancListInfoThng** | 물품 입찰 목록 | 크론 1차 수집 | tenders | 동일 | 동일 구조 |
| **getBidPblancListInfoEtcPPSSrch** | 나라장터 검색조건 기타 | 키워드 검색 시 | tenders | keyword(사전 매칭) | 목록 필드 동일 |
| **getBidPblancListInfoServcPPSSrch** | 검색조건 용역 | 키워드·기간 검색 | tenders | 검색조건 파라미터 | 목록 필드 동일 |
| **getBidPblancListInfoServcBsisAmount** | 용역 기초금액 | 상세 보강 시 | tender_details | 공고번호·차수 | 기초금액, 추정가격 등 |
| **getBidPblancListInfoPrtcptPsblRgn** | 참가가능지역 | 상세 보강 시 | tender_regions | 공고번호·차수 | 지역코드/명 |
| **getBidPblancListInfoLicenseLimit** | 면허제한 | 상세 보강 시 | tender_licenses | 공고번호·차수 | 면허/업종 제한 |
| **getBidPblancListInfoChgHstryServc** | 용역 변경이력 | 상세 보강 시 | tender_changes | 공고번호·차수 | 변경일시, 내용 |
| **getBidPblancListInfoEorderAtchFileInfo** | e발주 첨부파일 | 상세 보강 시 | tender_details(첨부목록) | 공고번호·차수 | 파일명, 다운로드 URL |

### 2) 계약정보서비스 (Base: 별도 URL — 공공데이터포털 계약정보서비스 확인)

| 오퍼레이션 | 용도 | 호출 시점 | 저장 테이블 | 주요 요청 파라미터 | 응답→저장 필드 |
|------------|------|-----------|-------------|---------------------|-----------------|
| 계약목록조회 | 청소 키워드 매칭 계약 | 크론 2차 수집 | contracts | 기간, 키워드(사전) | 계약번호, 계약일, 계약금액, 기관, 상대자, 관련공고번호 |
| 계약상세/변경·삭제이력 | 상세·이력 | 상세 페이지 | contracts, contract_changes | 계약번호 | 상세 필드, 이력 |

### 3) 계약과정통합공개서비스 (가능 시)

| 오퍼레이션 | 용도 | 호출 시점 | 저장/표시 |
|------------|------|-----------|-----------|
| 사전규격→공고→낙찰→계약 흐름 | 공고번호 하나로 전체 과정 | 공고 상세 페이지 | 타임라인 UI(API 응답 그대로 또는 캐시) |

---

## 2. 청소업 키워드 사전 (1차)

- **키워드**: 청소, 미화, 위생, 시설관리, 환경미화, 건물청소, 소독, 방역, 용역청소, 환경미화원
- **저장**: DB 테이블 `tender_keywords` (관리자에서 추후 수정 가능)
- **필터링**: 1차 수집은 기간 단위 전건 수집 후, 공고명/내용에 키워드 매칭해 `tenders` 저장 또는 `tenders.keywords_matched` 플래그

---

## 3. 저장 모델 요약

| 테이블 | 용도 | 유니크 | 비고 |
|--------|------|--------|------|
| tenders | 공고 기본(목록 필드) | (bid_ntce_no, bid_ntce_ord) | 마감임박/스크랩 연동 |
| tender_details | 상세(자격요건, 기초금액, 첨부요약) | tender_id 1:1 | |
| tender_regions | 참가가능지역 | (tender_id, region_code) | |
| tender_licenses | 면허/업종 제한 | (tender_id, seq) | |
| tender_changes | 변경이력 | (tender_id, chg_seq) | |
| contracts | 계약 | contract_no 등 | |
| user_saved_tenders | 스크랩 | (user_id, tender_id) | |

---

## 4. 크론·호출 제한

- **주기**: 30분~1시간 권장 (일 1,000건 제한 고려)
- **체크포인트**: `last_fetched_at`(날짜 구간) 저장 후, 다음 수집 시 중복 최소화
- **중복 방지**: INSERT 시 (bid_ntce_no, bid_ntce_ord) ON CONFLICT DO UPDATE

---

## 5. 환경 변수

- `DATA_GO_KR_SERVICE_KEY`: 공공데이터포털 인증키(Encoding 값 사용)
- (선택) `G2B_FETCH_INTERVAL_MINUTES`, `G2B_KEYWORDS` 오버라이드

---

## 6. 구현 완료 사항

- **DB**: `002_g2b_tenders.sql` — tenders, tender_details, tender_regions, tender_licenses, tender_changes, contracts, user_saved_tenders, tender_keywords, g2b_fetch_checkpoints
- **API 래퍼**: `lib/g2b/client.ts` (getBidPblancListInfoServc/Cnstwk/Thng), `lib/g2b/mapper.ts`, `lib/g2b/fetch-tenders.ts`
- **크론**: `POST /api/cron/fetch-g2b` — 인증키 있으면 실 API 호출, 없으면 스텁 1건
- **화면**: `/tenders` (목록·청소필터), `/tenders/dashboard` (오늘/마감임박/7일추이), `/tenders/[id]` (상세), `/contracts` (계약 목록)
- **환경변수**: `DATA_GO_KR_SERVICE_KEY`, `CRON_SECRET` (선택)
- **참고**: API 응답 필드명은 공공데이터포털 실제 응답에 맞게 `lib/g2b/mapper.ts`의 `mapItemToTender`에서 추가 매핑 가능.
