# 억울한 노쇼 이의 제기·취소 설계

구직자가 노쇼로 잘못 신고된 경우 이의를 제기하고, 관리자가 검토 후 노쇼를 취소(철회)할 수 있는 흐름을 정의합니다.

---

## 1. 현행 정리

- **job_reports**: `status` = `'open'` | `'resolved'` | `'rescinded'`, `rescinded_at` 있음. 노쇼 신고 시 INSERT 후 해당 `job_applications.status` → `no_show_reported`, `completed_job_assignments` 1건 DELETE.
- **30일 노쇼 집계**: 이미 `status != 'rescinded'` 인 건만 카운트하므로, rescind 시 자동으로 배지/집계에서 제외됨.
- **관리자 노쇼 페이지** (`/admin/job-reports`): 전체 노쇼 신고 목록, 4회 이상 누적 사용자 필터. 아직 이의 제기·취소(철회) UI 없음.

---

## 2. 목표

1. **구직자**: 본인이 노쇼로 처리된 건에 대해 「이의 제기」로 사유를 등록할 수 있게 한다.
2. **관리자**: 이의가 접수된 건을 모아 보고, 검토 후 「노쇼 취소(철회)」로 원복 처리할 수 있게 한다.
3. **취소 시**: 해당 건은 노쇼 이력/30일 배지에서 제외되고, 지원 상태는 다시 “확정”으로 복구한다.

---

## 3. 데이터 설계

### 3-1. 이의 저장 방식 (선택)

**옵션 A. job_reports에 컬럼 추가 (권장)**

- `job_reports`에 아래 컬럼 추가:
  - `appealed_at` TIMESTAMPTZ — 이의 제기 일시
  - `appeal_text` TEXT — 구직자가 입력한 이의 사유 (선택, 500자 제한 등)
- 장점: 테이블 하나로 유지, 조회 단순.  
- 제약: 신고 1건당 이의 1회만 저장 (재이의는 별도 정책 필요 시 확장).

**옵션 B. 이의 전용 테이블**

- `no_show_appeals` (id, job_report_id, user_id, appeal_text, status, created_at)
- 장점: 이의 이력 여러 건, 상태(접수/검토중/처리완료) 확장 용이.  
- 단점: 테이블·조인 증가.

**권장**: 1신고 1이의로 충분하다고 가정하고 **옵션 A**로 진행. 나중에 이의 재제기·상태 세분화가 필요하면 B로 마이그레이션.

### 3-2. job_reports 스키마 변경 (옵션 A 기준)

```sql
-- Migration: job_reports에 이의 컬럼 추가
ALTER TABLE public.job_reports
  ADD COLUMN IF NOT EXISTS appealed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appeal_text TEXT;

COMMENT ON COLUMN public.job_reports.appealed_at IS '구직자 이의 제기 일시';
COMMENT ON COLUMN public.job_reports.appeal_text IS '구직자 이의 사유 (500자 이내 권장)';
```

- **RLS**: 이미 `reported_user_id = auth.uid()`인 경우 SELECT 가능. 이의 제기는 **UPDATE**가 필요하므로, “피신고자(구직자)는 본인인 경우 appeal 관련 컬럼만 UPDATE 허용” 정책 추가 필요.
  - 기존: `job_reports_update_own` — reporter 또는 reported_user_id = auth.uid() 일 때 UPDATE.
  - reported(구직자)가 UPDATE 할 수 있으면, appeal_text / appealed_at 만 넣고 status 등은 건드리지 않도록 앱 로직에서 제한. 또는 policy에서 CHECK로 “reported만 appeal 필드만 변경 가능” 제한은 복잡하므로, **애플리케이션 레벨에서만** reported 사용자는 appeal_text, appealed_at 만 업데이트하도록 구현.

---

## 4. 구직자 플로우

### 4-1. 이의 제기 가능 조건

- 로그인한 사용자(구직자) 본인이 **피신고자**(reported_user_id)인 노쇼 신고가 있고,
- 해당 신고의 `status = 'open'` (아직 rescinded/resolved 아님),
- 해당 `job_applications.status = 'no_show_reported'` 인 건.

동일 report에 대해 **이미 appealed_at 이 있으면** “이미 이의 제기했습니다”로 중복 제기 불가.

### 4-2. 노출 위치

- **A. 구인글 상세 (`/jobs/[id]`)**  
  - 본인이 해당 글의 특정 포지션에 지원했고, 그 지원 건이 `no_show_reported` 일 때, 해당 지원 행(ApplicationList)에 「노쇼로 처리되었습니다. 이의가 있으시면 이의 제기를 해 주세요.» + **이의 제기** 버튼 노출.
- **B. 내가 지원한 현장 목록**  
  - 카드/리스트에서 상태가 “노쇼 발생”(또는 “마감”)인 글에 대해, 상세로 들어가서 위와 동일하게 이의 제기.  
  - 또는 카드에 “노쇼 처리됨 – 이의 제기” 링크를 두고 상세의 해당 포지션으로 스크롤 앵커 이동.

**권장**: 우선 **A(글 상세 내 지원 상태 영역)** 에만 이의 제기 버튼을 두고, “내가 지원한 현장”에서는 해당 글로 이동하도록 유도.

### 4-3. 이의 제기 UI

- **트리거**: “이의 제기” 버튼 클릭 시 모달 또는 인라인 폼 노출.
- **입력**: 이의 사유 (textarea, 500자 제한, 필수 또는 선택에 따라 placeholder: “출근했으나 노쇼로 기록되었습니다.” 등).
- **제출**: Server Action 호출 → `job_reports`에서 해당 report의 `appealed_at = now()`, `appeal_text = 입력값` UPDATE.  
  - 조건: `reported_user_id = auth.uid()`, `status = 'open'`, `appealed_at IS NULL`.

### 4-4. 이의 제기 후 안내

- 제출 성공 시: “이의가 접수되었습니다. 검토 후 연락드리겠습니다.” 토스트/메시지.
- 이미 이의한 경우: “이미 이의 제기하셨습니다.” 표시, 버튼 비활성화 또는 숨김.
- 관리자가 rescind 한 경우: 해당 지원 건은 다시 “확정”으로 보이므로, 이의 제기 버튼 자체가 없어짐.

---

## 5. 관리자 플로우

### 5-1. 이의 제기된 건 목록

- **위치**: `/admin/job-reports` 에서 “이의 제기된 건” 필터/탭 추가.
- **조건**: `job_reports` where `reason_type = 'no_show'` AND `appealed_at IS NOT NULL` AND `status = 'open'`.
- **표시**: 기존 테이블 컬럼 + “이의 일시”, “이의 사유”(일부 또는 전체), “노쇼 취소(철회)” 버튼.

### 5-2. 노쇼 취소(철회) 동작

- **트리거**: 관리자만 호출 가능한 Server Action (예: `rescindNoShowReport(reportId)`).
- **처리 순서**:
  1. `job_reports`: 해당 id에 대해 `status = 'rescinded'`, `rescinded_at = now()`, `updated_at = now()`.
  2. 해당 report의 `job_application_id`로 `job_applications`: `status = 'accepted'`, `updated_at = now()`.
  3. **completed_job_assignments 복구**: 노쇼 신고 시 DELETE 했던 행을 다시 INSERT.  
     - 필요한 값: job_application_id, position_id, job_post_id, worker_id, region, district, category_main_id, category_sub_id, pay_unit, pay_amount, normalized_daily_wage, work_date, skill_level, normalized_job_type_key  
     - `job_applications` → `job_post_positions` → `job_posts` 조인으로 조회 후 INSERT.
- **권한**: admin/editor 역할만 실행 가능 (기존 관리자 라우트와 동일).

### 5-3. 취소 후 영향

- 30일 노쇼 집계: 이미 `status != 'rescinded'` 만 카운트하므로 해당 건 제외됨.
- 구인자 화면: 해당 지원자는 다시 “확정”으로 보임 (필요 시 completed_job_assignments 복구로 “내 매칭” 등에도 다시 노출).
- 구직자: 해당 지원 건은 “확정”으로 표시, 이의 제기 버튼 없음.

---

## 6. API·Server Actions

| 이름 | 역할 | 권한 |
|------|------|------|
| `submitNoShowAppeal(reportId, appealText)` | job_reports의 appealed_at, appeal_text 업데이트 | reported_user_id = auth.uid(), status=open, appealed_at IS NULL |
| `rescindNoShowReport(reportId)` | job_reports → rescinded, job_applications → accepted, completed_job_assignments 재생성 | admin/editor |

---

## 7. RLS 정책

- **job_reports UPDATE**:  
  - 기존 `job_reports_update_own`: reporter 또는 reported_user_id = auth.uid() 일 때 UPDATE 허용.  
  - 구직자가 “이의 제기” 시에는 **reported_user_id = auth.uid()** 이고, **변경 컬럼을 appealed_at, appeal_text 로만 제한**하는 것은 DB 제약보다는 **애플리케이션**에서만 하면 됨.  
  - 악의적으로 구직자가 status 를 rescinded 로 바꾸지 않도록, Server Action에서 “reported 사용자는 appealed_at, appeal_text 만 업데이트” 로직으로 제한.

---

## 8. 예외·엣지 케이스

- **이의 제기 후 관리자가 “취소 안 함” 결정**:  
  - 별도 “이의 기각” 버튼을 두지 않고, rescind 하지 않으면 그대로 open 유지. 필요 시 나중에 `status = 'resolved'`(이의 검토 완료·노쇼 유지) 같은 값을 도입 가능.
- **동일 report에 재이의**:  
  - 현재 설계는 1신고 1이의. 재이의는 appeal_text 수정 허용 여부만 정책으로 결정 (예: appealed_at 이 있으면 수정 불가).
- **rescind 시 completed_job_assignments**:  
  - confirm 시 넣었던 것과 동일한 값으로 복구. job_posts/job_post_positions 가 수정되었을 수 있으므로, **현재 시점의** position/post 정보로 INSERT.

---

## 9. 구현 체크리스트

- [x] Migration: `job_reports` 에 `appealed_at`, `appeal_text` 추가. (`026_job_reports_appeal_columns.sql`)
- [x] Server Action: `submitNoShowAppeal(reportId, appealText)` — 구직자 이의 제기.
- [x] Server Action: `rescindNoShowReport(reportId)` — 관리자 노쇼 취소(철회) + application·completed_job_assignments 복구.
- [x] 구인글 상세: `no_show_reported` 인 본인 지원 포지션에 “이의 제기” 블록 + 모달/폼. (`NoShowAppealBlock`)
- [x] 관리자 노쇼 페이지: “이의 제기된 건만 보기” 필터, 이의 일시/사유/상태 컬럼, “노쇼 취소(철회)” 버튼.
- [ ] (선택) “내가 지원한 현장” 카드에서 노쇼 처리된 글에 “이의 제기” 링크 노출.

이 설계대로 구현하면 억울한 노쇼 처리된 구직자는 이의를 넣을 수 있고, 관리자가 검토 후 한 번에 노쇼 취소와 확정 복구까지 처리할 수 있습니다.
