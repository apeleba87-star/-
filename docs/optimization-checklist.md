# 클린아이덱스 개선 체크리스트 (속도 · 보안 · 비용)

기준일: 2026-11-03  
상태: **진행 중** (전부 최적화는 아님)

---

## `generate-content` / `generate-award-report` 가 뭐냐?

둘 다 **나라장터 데이터를 바탕으로 “리포트 글”을 매일 자동 발행**하는 cron이다. (G2B 수집 자체와는 별개)

| Cron | 하는 일 |
|------|---------|
| **`generate-content`** | **입찰** 일간 리포트 글을 만들어 `posts`에 넣고 발행 |
| **`generate-award-report`** | **낙찰** 시장 리포트 글을 만들어 발행 |

체크리스트에 적었던 「실제 사용·구독 가치 대비 빈도 재검토」 뜻:

> 이 리포트를 **누가 얼마나 보는지 / 유료·전용관 가치가 있는지** 보고,  
> 매일 돌릴지·이틀에 한 번으로 줄일지 나중에 정하자는 **메모**였다.

**지금 결정:** G2B 수집은 유지 · 위 두 리포트 cron도 **당분간 매일 유지** (끄지 않음).  
줄이고 싶으면 그때 스케줄만 바꾸면 된다.

---

## 1. 속도

### 바로 확인
- [ ] 배포 후 `/products/kiehl-glasking` 두 번 열어 **첫 HTML 대기** 측정
- [ ] `x-vercel-cache: HIT` (또는 `STALE`) 확인 — 계속 `MISS`/`no-store`면 ISR 미적용
- [ ] 제품 상세 `loading.tsx` 스켈레톤 확인

### 제품·지식 페이지
- [ ] 제품 상세를 **서버 셸 + 작은 클라이언트**로 더 쪼개기
- [ ] 단건·번들 캐시 API 검토
- [ ] 관련 질문·블로그 `Suspense` 지연 로딩
- [ ] 히어로 thumb / LCP 미세 조정
- [ ] 지식 허브 홈·목록 LCP·번들 점검

### 공통 UI
- [ ] Header `framer-motion` 비용 검토
- [ ] 전역 폰트·스크립트 점검

### 앱
- [ ] 현장앱 목록·동기화 체감 재측정

---

## 2. 비용

### 스케줄 (vercel.json)
- [x] `fetch-g2b` — **유지** (요청 반영)
- [x] `publish-scheduled-edu-blog` — **10분 → 30분** (예약 창 lookback 45분)
- [x] `generate-content` / `generate-award-report` — **의미 정리 · 당분간 매일 유지**
- [ ] Vercel/Supabase 월 사용량 대시보드 확인 (수동)

### 숨긴 기능
- [x] 숨긴 **공개 URL** 직접 접근 → 홈으로 302 (`middleware`)
- [x] 숨긴 **공개 API** (`/api/demand`, `/api/magam`, `/api/jobs` …) → **410**
- [x] `/admin/open-data-ingest` 등은 보관함에서만 (비용 안내 유지)
- [ ] admin 수동 ingest 실사용 시 비용 모니터링

### 데이터·스토리지
- [ ] AI 블로그 원본 사진·스토리지 용량 모니터링
- [ ] tmp/export가 배포에 안 실리게 유지

---

## 3. 보안

### 접근 표면
- [x] 숨긴 공개 URL 직접 접근 차단(리다이렉트) 적용
- [x] `/api/test-g2b`, `/api/supabase-test` — 프로덕션은 admin만 (`isDebugApiAllowed`)
- [ ] `/api/cleanidex/**` 노출 범위 축소 (웹 SaaS 미사용 시)

### 앱·API
- [ ] AI 블로그·구독 API rate limit/스코프 재점검
- [x] Cron: `verifyCronSecret` / `CRON_SECRET` 필수 (시크릿 없으면 거부)
- [x] 관리자 레이아웃: admin/editor만 (기존)

### 인프라
- [ ] Upstash rate limit 도입 여부 결정
- [ ] CSP / 보안 헤더 점검
- [ ] 시크릿 회전 주기

### 운영
- [ ] 분기 `npm audit`
- [ ] (선택) 외부 보안 리뷰

---

## 4. 우선순위

| 순위 | 할 일 | 상태 |
|------|--------|------|
| P0 | 배포 후 글라스킹 캐시·TTFB | 대기(배포 후) |
| P0 | Cron 시크릿·관리자 권한 | 코드상 OK · 환경변수는 대시보드 확인 |
| P1 | 숨긴 URL/API 차단 | **적용** |
| P1 | G2B 유지 · 예약글 30분 · 리포트 cron 유지 | **적용** |
| P2 | 제품 상세 추가 분리 · Suspense | 남음 |
| P2 | Upstash | 남음 |
| P3 | Header 다이어트 · 코드 삭제 | 남음 |

---

## 기록

- 2026-11-03 — 비용 cron 중지·보관함·제품 상세 1차 최적화
- 2026-11-03 — 예약글 cron 30분, 숨김 URL 302·API 410, G2B/입찰·낙찰 리포트 cron 유지
