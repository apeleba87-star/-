# 클린아이덱스 지식 허브 — Phase 0 범위 고정

**상태:** Phase 0–4 구현 완료 (2026-07-09)  
**작성일:** 2026-07-09  
**다음 단계:** Phase 1 — `/services/office-regular` 세로 슬라이스 1페이지 E2E

---

## 1. 개편 방향 (한 줄)

**데이터 허브 → 청소 지식 허브.** 오염·재질·서비스별 방법·용품을 제공하고, 용품 구매(쿠팡·스마트스토어)와 청소 문의(정기·입주)로 전환한다.

**필수 요건:** 속도 · 모바일 · SEO (Non-negotiable)

---

## 2. 제품 범위 — 유지 · 폐기 · 개편

### 2.1 폐기 (메인 SEO·네비에서 제거)

| 기능 | 현재 경로 | Phase 0 결정 |
|------|-----------|--------------|
| 이사검색 | `/` (move budget) | **폐기** — 홈을 지식 허브로 교체 (Phase 4) |
| 입주레이더 | `/demand`, `/move` | **폐기** — 301은 Phase 4 |
| 클린아이덱스 SaaS | `/cleanidex` | **폐기** — 라우트 비노출·종료 (Phase 4) |

### 2.2 유지

| 기능 | 경로 | Phase 0 결정 |
|------|------|--------------|
| 입찰 | `/tenders`, `/tender-awards` | **유지** — 푸터·업계 메뉴 |
| 견적 | `/estimate` | **유지** — 푸터·업계 메뉴 |

### 2.3 개편

| 기능 | Phase 0 결정 |
|------|--------------|
| 마감 | **문의 처리 허브**로 개편 — 구인구직·오더판매·문의건 배정 (Phase 5 연동) |
| 지식 허브 | **신규 메인** — guides + services |

---

## 3. 콘텐츠 3갈래 (로드맵)

| 갈래 | `guide_type` | URL 패턴 | MVP 포함 |
|------|--------------|----------|----------|
| 서비스형 방법 | `service_method` | `/services/{slug}` | **예 (8페이지)** |
| 서비스형 용품 | `service_supplies` | `/services/{slug}/supplies` | **예 (4페이지)** |
| 문제형 (오염×재질) | `problem` | `/guides/{slug}` | **아니오 (Phase 2+)** |

**MVP 합계: 8 URL** (방법 4 + supplies 4)

---

## 4. MVP 페이지 목록 (확정)

### 4.1 정기청소 (frequency: `recurring`)

| slug | 유형 | H1 (한글) | 문의 CTA |
|------|------|-----------|----------|
| `office-regular` | method | 사무실 정기청소 방법 | 정기청소 |
| `office-regular` | supplies | 사무실 정기청소에 필요한 약품·장비 | 정기청소 |
| `commercial-regular` | method | 상가 청소 방법 | 정기청소 |
| `commercial-regular` | supplies | 상가 청소에 필요한 약품·장비 | 정기청소 |
| `stairs-regular` | method | 계단 청소 방법 | 정기청소 |
| `stairs-regular` | supplies | 계단 청소에 필요한 약품·장비 | 정기청소 |

### 4.2 1회성 청소 (frequency: `one_time`)

| slug | 유형 | H1 (한글) | 문의 CTA |
|------|------|-----------|----------|
| `move-in` | method | 입주청소 방법·순서 | 입주청소 |
| `move-in` | supplies | 입주청소 준비물·약품 | 입주청소 |

### 4.3 Phase 1 우선 순위 (세로 슬라이스)

**첫 구현 대상 1페이지만:**

- `office-regular` (method) — `/services/office-regular`

나머지 7페이지는 Phase 1 후반~Phase 4에서 동일 템플릿으로 확장.

---

## 5. URL 규칙 (확정)

| 규칙 | 내용 |
|------|------|
| slug | 영문 kebab-case, 변경 최소화 |
| 한글 | H1·title·description에만 사용 |
| 서비스 방법 | `/services/{service_slug}` |
| 서비스 용품 | `/services/{service_slug}/supplies` |
| 문제형 (추후) | `/guides/{slug}` |
| 허브 | `/services`, `/services/regular`, `/services/one-time` |
| 문의 | `/inquiry/regular`, `/inquiry/move-in` |
| 상품 클릭 | `/go/p/{id}` (Phase 2) |
| canonical | trailing slash 없음 |

**예시**

```
/services/office-regular
/services/office-regular/supplies
/inquiry/regular?ref=office-regular
```

---

## 6. 서비스 Taxonomy (MVP + 확장 예비)

### 6.1 MVP에 포함 (`cleaning_services`)

| slug | name | frequency | inquiry_type |
|------|------|-----------|--------------|
| `office-regular` | 사무실 정기청소 | recurring | regular |
| `commercial-regular` | 상가 청소 | recurring | regular |
| `stairs-regular` | 계단 청소 | recurring | regular |
| `move-in` | 입주청소 | one_time | move_in |

### 6.2 Phase 2+ 확장 (MVP 제외, slug만 예약)

| slug | name | frequency |
|------|------|-----------|
| `apartment-common` | 아파트 공용부 청소 | recurring |
| `move-out` | 이사·퇴거 청소 | one_time |
| `renovation` | 리모델링 후 청소 | one_time |
| `factory-regular` | 공장·창고 정기청소 | recurring |

---

## 7. AI·콘텐츠 생성 (확정)

| 항목 | 결정 |
|------|------|
| 방식 | **하이브리드** — DB facts 주입 + AI가 초기 전 블록 생성 |
| MVP | AI(또는 에이전트)가 `body_json` 초안 작성 → DB 시드 |
| 정확도 | 약품·금지사항은 facts 강제; AI는 서술·FAQ·단계 |
| 발행 | 초기 `CONTENT_AUTO_PUBLISH=false` (검수 후 발행) |
| 수정 | 운영자 **인라인 편집** (블록·상품 URL) — Phase 3 |

---

## 8. 전환·수익 (MVP 범위)

| 레이어 | MVP | 비고 |
|--------|-----|------|
| 용품 구매 | Phase 2 | 쿠팡 + 스마트스토어, 가이드 하단 |
| 정기청소 문의 | Phase 2 | `/inquiry/regular` |
| 입주청소 문의 | Phase 2 | `/inquiry/move-in` |
| 마감 오더 연동 | Phase 5 | 문의 → 구인·오더 인박스 |

### CTA 강도 (확정)

| 페이지 유형 | 문의 CTA |
|-------------|----------|
| `service_method` | **강함** (주 CTA) |
| `service_supplies` | 중~강 |
| `problem` (추후) | 약함 |

---

## 9. SEO·기술 원칙 (확정)

| 항목 | 목표 |
|------|------|
| LCP | ≤ 2.5s (모바일) |
| INP | ≤ 200ms |
| CLS | ≤ 0.1 |
| 렌더 | SSG/ISR, 가이드 라우트 lean bundle |
| 스키마 | `HowTo` + `FAQPage` + `BreadcrumbList` |
| indexable | 품질 검증 통과 + `published_at` 있는 페이지만 sitemap |
| LocalBusiness | **사용 안 함** |

### title 패턴

| 유형 | 패턴 |
|------|------|
| service_method | `{서비스명} 방법 \| 클린아이덱스` |
| service_supplies | `{서비스명} 약품·장비 \| 클린아이덱스` |
| problem | `{오염} {재질} 제거 방법 \| 클린아이덱스` |

---

## 10. Phase 로드맵 (참고)

| Phase | 내용 |
|-------|------|
| **0** | **범위 고정 (본 문서)** |
| 1 | `office-regular` E2E — DB, 라우트, AI 시드, SEO, CWV |
| 2 | supplies, 용품 블록, 문의 CTA, `/go` |
| 3 | 운영 인라인 편집 |
| 4 | MVP 8페이지 전체, 홈 개편, 301, SaaS 폐기 |
| 5 | AI 배치 크론, 문제형 가이드, 마감 연동 |

---

## 11. Phase 0 완료 체크리스트

- [x] MVP 8 URL 확정
- [x] 폐기: 이사검색, 입주레이더, SaaS
- [x] 유지: 입찰, 견적
- [x] 마감 개편 방향 확정
- [x] URL 규칙 확정
- [x] 서비스 taxonomy MVP 4종 확정
- [x] AI 하이브리드·인라인 편집 방향 확정
- [x] Phase 1 첫 페이지: `office-regular` method
- [x] 기계可读 레지스트리: `lib/knowledge-hub/mvp-pages.ts`

---

## 12. 미결 (Phase 1 전에 채울 것)

| 항목 | 담당 | 비고 |
|------|------|------|
| 스마트스토어 대표 URL 1~2개 | 운영자 | 용품 블록용, 없으면 Phase 2까지 placeholder |
| 301 상세 맵 (demand/move → 가이드) | Phase 4 | slug 목록 확정 후 |
| `cleaning_guides` DB 마이그레이션 | Phase 1 | |
