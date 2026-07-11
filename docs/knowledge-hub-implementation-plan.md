# 청소 지식 허브 — 문서 근거 데이터 구현 기획안

**상태:** 기획  
**작성일:** 2026-07-12  
**근거 문서:**  
- `독일 키엘 세제 리스트업.docx`  
- `청소 사례 데이터.docx`  
- `청소 지식 원문.docx`  
**원칙:** 문서에 없는 내용은 만들지 않는다. 더미·임의 생성 금지.

---

## 1. 목표

1. 위 3종 데이터만으로 **제품 · 재질 · 오염 · 레시피 · 원칙(팩트/규칙)** 을 정규 저장한다.  
2. 엔티티가 **서로 연결**되어, 어느 축으로 들어와도 같은 사용법·제품으로 도착한다.  
3. 제품 선택 시 **운영자가 넣은 판매 링크**로만 구매 이동한다.  
4. 현장·오염·재질·레시피 열람 중 **전문업체 문의**로 전환한다.  
5. 기존 카탈로그·관리자·URL은 **유지·병합**하고, 근거 없는 시드 문장은 제거·교체한다.  
6. 이후 신규 문서/사례는 **검수 후 upsert**, 조회·검색·문의 로그로 **인기 주제 재편집**이 가능하게 한다.

---

## 2. 비목표 (이번 범위에서 하지 않음)

- 문서에 없는 현장(공장·헬스장 등)을 임의 본문으로 채우기  
- 쿠팡 키워드 등으로 **가짜 상품 링크 자동 생성**  
- 카페 원문 통째 HTML/페이지 게시  
- 전체 wipe 후 사이트 재구축  
- 일반/업체(`/pro`) UI 완전 분리의 1차 필수화 (2차 후보)

---

## 3. 콘텐츠·데이터 원칙

| 원칙 | 설명 |
|------|------|
| 근거 필수 | 모든 공개 문장·수치·금지는 문서/승인된 사례에 `sourceRef` 보유 |
| 연결은 근거만 | 「적용 재질」「제거 오염」「사용 장소」문서 필드 또는 사례 매핑만 링크 |
| 빈칸 허용 | 연결 데이터 없는 허브는 비우거나 “등록된 사용법 없음” — 채우기 금지 |
| 판매 링크 | 제품 `salesUrl`(및 선택적 복수 채널) — 없으면 구매 CTA 비노출 |
| 문의 CTA | 현장·오염·재질·레시피·가이드에 공통 「전문업체 문의」 |
| 신뢰 표시 | `confidence` / `evidenceLevel`(실제사례·제품스펙·원칙) 노출 |

---

## 4. 정보 구조 (IA)

### 4.1 탐색 축 (유지)

| 축 | 경로 | 역할 |
|----|------|------|
| 현장별 | `/services/...` | 공간·업무 맥락 허브 |
| 오염·문제 | `/guides`, `/pollution` | “무엇을 지울까” |
| 재질 | `/materials` | “어디에 써도 되나” |
| 제품 | `/products` | “이 세제는 무엇인가” → 판매 |
| 레시피 | `/cleaning` | “어떻게 쓰나” (조인 중심) |
| 검색 | `/search` | 통합 진입 |

### 4.2 페이지에 붙는 CTA

- **제품 카드/상세:** `판매 링크` (있을 때만)  
- **허브·가이드·레시피:** `전문업체 문의` → 기존 `/inquiry/regular` 또는 `/inquiry/move-in` (맥락 쿼리: category, contaminant, material, recipe, path)

### 4.3 상호 연결 (조인)

```
Product ←→ Material / Contaminant   (리스트업의 적용·제거 필드)
Recipe = Material × Contaminant × Product (+ optional Zone)
Facility/Topic 페이지 ⊂ Recipe.guidePaths 또는 zoneIds로만 연결
Fact/Rule → Product / Material / Contaminant / Recipe에 삽입
CaseEvidence → Recipe의 “현장 근거” (원본 사례ID 보존)
```

---

## 5. 데이터 모델 (저장)

### 5.1 마스터 (코드→DB 이관 목표)

| 엔티티 | 필수 필드 (요약) | 출처 |
|--------|------------------|------|
| **Product** | id, brand, name, aliases, ph, dilution, packSizes, mainUse, compatibleMaterialIds, contaminantIds, forbiddenMaterialIds, warnings, salesUrl?, status | 키엘 리스트업 |
| **Material** | id, name, riskLevel, notes, aliases | 리스트업+원문+사례 |
| **Contaminant** | id, name, type, notes | 리스트업+사례 |
| **Recipe** | triad IDs, steps, dilution, dwell, tools, warnings, summary, caseIds[], guidePaths/zoneIds, confidence | 사례(작업형) |
| **Fact / Rule** | body, severity, linked IDs, sourceRef | 원문 분해 |
| **CaseEvidence** | caseId, raw fields snapshot, evidenceLevel | 사례 원본 |
| **SourceDoc** | docKey, version, ingestedAt | 3종 문서 추적 |

### 5.2 운영 필드

- `salesUrl`, `salesLabel` (제품)  
- `published` / `draft`  
- `sourceRef[]` (어느 문서·어느 사례에서 왔는지)

### 5.3 가이드 본문 (`cleaning_guides`)

- **자동 조립 블록만** 마스터에서 생성: 연결 레시피, 제품(판매링크), 팩트/규칙, 문의 CTA  
- **서술 문장**은 (1) 문서에서 추출한 문장만 또는 (2) 관리자 직접 편집  
- 기존 `generate-from-db`의 임의 문장 생성은 **끄거나 근거 문장만 허용**

### 5.4 로그 (2단계)

| 이벤트 | 용도 |
|--------|------|
| page_view (path, entity ids) | 인기 주제 |
| search_query | 콘텐츠 우선순위 |
| inquiry_submit (context) | 전환·니즈 |
| product_sales_click | 판매 성과 |

---

## 6. 문서 → 저장 파이프라인

### Phase A — Ingest (1회 + 재실행 가능)

1. DOCX → 구조화 JSON (제품 카드 / 사례 레코드 / 원문 포스트 단위)  
2. ID 매핑 테이블 (한글명 → `kiehl-*`, material/contaminant id)  
3. 미매칭 큐 → 관리자 확정  
4. upsert to knowledge store (초기: TS/JSON 또는 Supabase 테이블)  
5. `SourceDoc` 버전 기록

### Phase B — Publish graph

1. Recipe 승인 (작업형 사례만)  
2. 가이드형 사례(BATHROOM-GUIDE 등) → **선택 허브 초안**으로만 (가짜 Recipe 금지)  
3. 원문 → Fact/Rule만 추출, raw는 archive  
4. 카탈로그 Topic 중 **연결 Recipe/Product가 1개 이상인 페이지만** 공개 인덱스 강화  
5. 연결 0인 Topic: noindex 또는 “데이터 없음” 유지 (더미 채움 금지)

### Phase C — CTA wiring

1. 제품 관리 UI에 판매 링크 입력  
2. 전 가이드/허브에 문의 CTA + context query  
3. (선택) 기존 자동 쿠팡 카드는 판매링크 있는 제품으로만 대체하거나 제거

---

## 7. 기존 콘텐츠 처리 방침

| 대상 | 조치 |
|------|------|
| 카탈로그 URL·카테고리 트리 | **유지** |
| `initial-knowledge` 중 문서와 일치하는 제품/재질 | **유지·보강** |
| 문서에 없는 제품·레시피·문장 | **제거 또는 draft** |
| 시드로 생성된 장문 가이드 | 블록을 **문서 근거 조립으로 재생성** 후, 이미 손본 문장은 관리자 편집 우선 |
| path 휴리스틱 linker | 문서 매핑 확정 후 **보조**로만 유지 |

**Wipe 전면 삭제 비권장.** 병합 + 근거 없는 항목 purge.

---

## 8. 화면·기능 기획

### 8.1 공개

- **제품 상세:** 스펙(문서) · 적용 재질 · 제거 오염 · 레시피 · **판매하기** · 문의  
- **레시피:** 단계·주의·근거 사례 · 제품 판매 · 관련 현장/오염  
- **현장 Topic:** 연결된 레시피·제품만 리스트 · 없으면 빈 상태 + 문의  
- **오염/재질:** 동일  
- **검색:** 제품명·별칭·오염·재질·사례명

### 8.2 관리자 (`/admin/knowledge-hub` 확장)

1. 문서 ingest 업로드/재실행  
2. 미매칭 큐  
3. 제품 CRUD + **판매 링크**  
4. 레시피 승인/반려  
5. Fact/Rule 편집  
6. 가이드 목록·인라인 편집 (기존)  
7. (2단계) 조회·검색·문의 리포트 → “만들 콘텐츠 후보”

### 8.3 문의

- CTA 문구: 「전문업체 문의하기」  
- 도착: 기존 문의 폼 + hidden/query로 맥락 전달  
- 문의 데이터에 `source_path`, `product_id`, `recipe_id` 등 저장

---

## 9. 구현 단계 (로드맵)

### Sprint 0 — 정책·정리 (짧음)

- [ ] 더미 생성 경로 목록화 (`generate-from-db` 임의 문장, coupang 자동 등)  
- [ ] “근거 없는 공개 금지” 체크리스트를 시드/빌드에 반영할 위치 결정

### Sprint 1 — 마스터 적재

- [ ] 키엘 리스트업 → Product JSON + 재질/오염 링크  
- [ ] 사례 23건 파싱 → CaseEvidence  
- [ ] 작업형 ~17건 → Recipe draft  
- [ ] 원문 → Fact/Rule 초안 20~40개  
- [ ] 기존 knowledge와 id 병합, 불일치 리포트

### Sprint 2 — 연결·공개

- [ ] Product/Material/Contaminant/Recipe 페이지가 **저장 데이터만** 렌더  
- [ ] 현장 Topic에 연결 레시피·제품 패널 (0건이면 빈 UI)  
- [ ] 근거 없는 시드 본문 제거/재조립  
- [ ] 판매 링크 필드 + UI CTA  
- [ ] 전문업체 문의 CTA + 맥락 파라미터

### Sprint 3 — 운영

- [ ] 관리자 판매링크·레시피 승인 UI  
- [ ] 신규 문서 upsert 절차 문서화/버튼  
- [ ] (선택) Supabase에 knowledge 테이블 이관

### Sprint 4 — 성장 루프

- [ ] view/search/inquiry/sales_click 로그  
- [ ] 관리자 “인기·미답변 주제” 대시보드  
- [ ] 인기 주제 = 기존 엔티티 재조합 가이드 초안 (신규 사실 발명 금지)

---

## 10. 신규 데이터 업데이트 운영

1. 새 DOCX/메모 업로드 또는 JSON 패치  
2. 자동 파싱 → diff (추가/변경/삭제 후보)  
3. 관리자 승인  
4. upsert (같은 id면 스펙 갱신, 편집된 가이드 서술문은 유지)  
5. 판매 링크는 수동 필드 — 문서 ingest가 덮어쓰지 않음  
6. 공개 캐시 revalidate

---

## 11. 성공 기준

| 지표 | 기준 |
|------|------|
| 출처 | 공개 Product/Recipe 100% `sourceRef` 보유 |
| 더미 | 문서 밖 희석비·절차 0건 |
| 연결 | 제품↔재질/오염, 레시피↔삼중 조인 동작 |
| 판매 | `salesUrl` 있는 제품만 구매 CTA |
| 문의 | 주요 허브·가이드에 문의 CTA + 맥락 전달 |
| 빈 허브 | 데이터 없는 현장 페이지에 가짜 본문 없음 |

---

## 12. 리스크·대응

| 리스크 | 대응 |
|--------|------|
| 리스트업 상세가 일부 제품만 존재 | 표 요약만 있는 제품은 요약 필드로만 공개, 상세 과장 금지 |
| 사례 시설 미확인 | zone 연결 생략, 오염×재질 레시피만 |
| 기존 시드와 이름 불일치 | 매핑 테이블 + 관리자 큐 |
| SEO 페이지 수 대비 내용 빈약 | 빈 페이지 noindex 또는 허브만 유지 |
| 판매 링크 미입력 | CTA 숨김 — 깨진 아웃링크 금지 |

---

## 13. 바로 다음 실행 추천

1. **Sprint 1:** 키엘 리스트업 + 사례 → 정규 JSON 적재 (코드/DB)  
2. **Sprint 2:** 공개 UI를 “저장분 + 판매링크 + 문의”만 쓰도록 전환  
3. 근거 없는 generate/시드 문장 제거  

이 순서가 “문서만 · 연결 · 판매 · 문의” 네 요구를 가장 빨리 만족한다.
