# 삭제·숨김 정책 체크리스트

기준일: 2026-11-03  
방침:

- **비용을 먹는 것** → cron/외부호출 **중지·삭제(동결)**
- **비용·속도와 무관한 기능** → **삭제하지 말고 숨김** (연쇄 삭제 위험 회피)
- 숨긴 기능은 **관리자 「보관함」** 한곳에서만 관리

**구현 상태 (2026-11-03):** 비용 cron `vercel.json`에서 제거 · 공개 메뉴/sitemap 숨김 · `/admin/vault` 보관함 추가. 페이지 코드는 삭제하지 않음.

---

## 원칙


| 구분          | 하는 일                                       | 하지 않는 일            |
| ----------- | ------------------------------------------ | ------------------ |
| **비용 컷**    | `vercel.json` cron 제거/주석, 외부 API ingest 중단 | 관련 페이지 폴더를 한꺼번에 rm |
| **숨김**      | 공개 메뉴·사이트맵·홈 카드에서 제거, 필요 시 301 유지          | import 그래프 대량 삭제   |
| **관리자 보관함** | `/admin/vault`(가칭)에 숨긴 화면 링크 모음            | 일반 업무 허브에 섞어 두기    |


---

## A. 비용 컷 — 삭제·동결할 것 (실행 시 1순위)

서버리스 호출·외부 API·스케줄이 돈을 씀. **페이지만 남기고 cron만 꺼도 효과 큼.**

### A-1. Cron / 수집 (끄기)


| Cron / 작업                                                 | 이유                     |
| --------------------------------------------------------- | ---------------------- |
| `ingest-demand-keywords`                                  | 검색·키워드 수집 비용           |
| `ingest-demand-rtms-seoul`                                | RTMS 대량 수집             |
| `ingest-demand-searchad`                                  | 검색광고 API               |
| `ingest-demand-rtms-deals` / `plan-demand-rtms-deal-jobs` | demand 파이프             |
| `generate-demand-sales-report`                            | demand 리포트 생성          |
| `generate-move-rtms-seo`                                  | 이사 SEO 생성              |
| `job-wage-daily-report`                                   | 일당 리포트 (삭제 가능 확정)      |
| `naver-trend-report`                                      | 마케팅 트렌드 리포트 (삭제 가능 확정) |
| `sync-worknet-jobs`                                       | 워크넷 동기화 (인력 쪽)         |
| `close-expired-listings`                                  | 마켓 만료 처리               |
| `close-expired-job-posts`                                 | 인력 만료 처리               |
| `cleanidex-purge-trashed-contracts`                       | SaaS 웹 안 쓰면            |
| (있으면) demand `backfill-clean-score`                       |                        |




### A-2. 관리자 수동 실행도 막기 (비용 같은 파이프)


| 대상                                          |                    |
| ------------------------------------------- | ------------------ |
| `/admin/open-data-ingest`의 demand/이사/워크넷 버튼 | 보관함으로만 이동 후 비활성 권장 |
| `/api/admin/ingest-demand-*`                | cron과 동일 파이프       |
| `/api/admin/generate-demand-sales-report`   |                    |
| `/api/admin/generate-move-rtms-seo`         |                    |
| `/api/cron/*` 위 목록                          |                    |




### A-3. 비용 컷에서 **빼 둘 것** (유지)


| Cron                         | 이유     |
| ---------------------------- | ------ |
| `fetch-g2b`                  | 입찰     |
| `fetch-scsbid-award-raw`     | 낙찰     |
| `generate-content`           | 입찰 리포트 |
| `generate-award-report`      | 낙찰 리포트 |
| `publish-scheduled-edu-blog` | 청소지식   |
| `process-subscriptions`      | AI 구독  |
| `purge-old-notifications`    | 알림 정리  |


---



## B. 숨김 — 삭제하지 말 것 (관리자 보관함)

코드·라우트는 유지. **일반 사용자 메뉴·홈·사이트맵·푸터에서만 제거.**  
관리자는 `/admin/vault`에서만 연다.

### B-1. 공개 화면 숨김 목록


| 기능               | 경로 (예시)                 | 숨김 방법                          |
| ---------------- | ----------------------- | ------------------------------ |
| 입주레이더            | `/demand/*`             | 이미 301 유지 + 메뉴 없음              |
| 이사검색             | `/move/*`               | 이미 301 유지                      |
| 광고 문의(레이더)       | `/advertise`            | 메뉴·푸터 제거, URL은 관리자만            |
| 마감앱 웹            | `/magam`, `/p`          | 메뉴·스토어 카피 제거, 직접 URL은 잠금 또는 유지 |
| 현장 마켓            | `/listings`             | primary nav·sitemap 제외         |
| 인력 센터            | `/jobs`, `/jobs/public` | 同上                             |
| 협력 센터            | `/partners`             | 同上                             |
| 일당 리포트           | `/job-market-report`    | 전용관·메뉴 제거                      |
| 마케팅 리포트          | `/marketing-report`     | 同上                             |
| 뉴스레터 아카이브        | `/archive`              | 푸터/메뉴 제거                       |
| UGC              | `/ugc`                  | 메뉴 없음 유지·강화                    |
| 업계소식             | `/industry-news`        | 홈 카드 제거                        |
| `/facilities`    |                         | 메뉴 없음, 선택적 301                 |
| `/news` 허브       |                         | 이미 301 — **깨진 메뉴 링크만 수정**      |
| cleanidex SaaS 웹 | `/cleanidex`            | 이미 301                         |




### B-2. 관리자 화면 → 보관함으로 이동

일반 허브(`콘텐츠·리포트`, `광고·구독`, `데이터·수집` 등)에서 빼고 **보관함 섹션만** 노출.


| 숨길 관리 화면                            | 현재 위치 감                                       |
| ----------------------------------- | --------------------------------------------- |
| 입주레이더 광고                            | `/admin/radar-ads`                            |
| 마감 공고·통계                            | `/admin/magam-listings`, `/admin/magam-stats` |
| 뉴스레터 큐                              | `/admin/newsletter`                           |
| UGC 검수                              | `/admin/ugc`                                  |
| 공유 열람권 로그                           | `/admin/share-unlocks`                        |
| 일당 리포트 입력                           | `/admin/job-wage-report`                      |
| 네이버 트렌드 키워드                         | `/admin/naver-trend-keywords`                 |
| 데이터 수집(demand/이사/워크넷)               | `/admin/open-data-ingest` (또는 해당 탭)           |
| 마켓·인력·협력·노쇼 관련 admin                | listings/jobs/partners/job-reports            |
| (선택) product-sales 외 obsolete 슬롯 문서 |                                               |


대시보드 카드 **「큐 (미사용)」「UGC 검수」** 는 메인에서 제거하고 보관함으로.

### B-3. API는?


| 정책                   | 대상                                                                         |
| -------------------- | -------------------------------------------------------------------------- |
| **호출 중지(비용)**        | 위 A cron·admin ingest                                                      |
| **라우트 파일 삭제 안 함**    | `/api/magam/`**, `/api/jobs/**`, `/api/demand/**` 등 — 숨긴 UI가 나중에 다시 켤 수 있게 |
| **공개 클라이언트에서 안 부르게** | 메뉴·앱 스토어·홈에서 링크 제거가 핵심                                                     |


---



## C. 관리자 「보관함」 설계 (구현 시)

가칭: `/admin/vault`  
권한: 기존 admin만.

```
/admin/vault
  ├─ 안내: "비용 cron은 중지됨. 화면만 보관. 재개 전 cron 검토."
  ├─ 공개 미리보기 링크 (새 탭) — 숨긴 URL 목록
  ├─ 관리 화면 링크 — B-2 목록
  └─ 중지된 cron 체크리스트 (읽기 전용, vercel.json과 동기 메모)
```

`lib/admin/nav-config.ts`에 hub 하나:

- `id: "vault"`
- `label: "보관함 (숨김 기능)"`
- 메인 대시보드·다른 hub `items`에서는 해당 링크 제거

---



## D. 금지 (숨김·삭제 대상 아님)


| 유지                                                 |     |
| -------------------------------------------------- | --- |
| 지식 허브·제품·장비·오염·장소                                  |     |
| `/blog`, `/practice`, `/questions`                 |     |
| `/ai-blog`, 현장앱, `/report/[token]`                 |     |
| `/estimate`, 견적 문의                                 |     |
| `/tenders`, `/tender-awards`, 입찰·낙찰 **리포트**        |     |
| `/api/ai-blog/**`, 구독, G2B·`generate-content` cron |     |


---



## E. 실행 순서 (승인 후)

1. **비용:** `vercel.json`에서 A-1 cron 제거/주석 → 배포
2. **숨김:** 공개 nav·sitemap·홈 카드에서 B-1 제거
3. **보관함:** `/admin/vault` + nav-config에서 B-2 이동
4. **대시보드** UGC/뉴스레터 카드 메인에서 제거
5. (선택·나중) 수개월 미사용 후 코드 삭제 PR — 그때만 rm

---



## 한 줄

**돈 나가는 cron/수집만 끊고**, 마감·마켓·인력·레이더·뉴스레터·UGC·리포트 **화면은 삭제하지 않고 숨긴 뒤 관리자 보관함에서만 관리**한다.