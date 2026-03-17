# 보안 점검 및 강화: 악의적 공격 시뮬레이션 및 대응

악의적 공격자 관점에서 시스템을 노리는 시나리오와, 발견된 취약점·대응 방안을 정리한 문서입니다.

---

## 1. 공격 시나리오 및 시뮬레이션

### 1.1 개인정보 탈취

| 공격 목표 | 시나리오 | 현재 동작 | 위험도 |
|-----------|----------|-----------|--------|
| **확정 지원자 연락처** | 구인자가 아닌 사용자가 `/jobs/[id]`에서 다른 사람 구인글의 확정자 프로필(이메일·연락처) 조회 | RLS `profiles_select_accepted_applicants`: 구인자(`j.user_id = auth.uid()`)이고 해당 글의 **확정된** 지원자(`a.status = 'accepted'`)인 경우만 SELECT 허용. 앱에서도 `isOwner`일 때만 `profiles`에서 email/phone 조회. | **낮음** (RLS·앱 이중 검증) |
| **비공개 상세(주소·연락처)** | 타인의 `job_post_private_details` 조회 또는 수정 | RLS: SELECT는 구인자이거나 확정된 지원자만. INSERT/UPDATE/DELETE는 구인자만. 앱에서 구인자일 때만 조회. | **낮음** |
| **전체 프로필(이메일·전화) 대량 수집** | 인증 없이 또는 일반 계정으로 `profiles` 테이블 스캔 | RLS `profiles_own`: 본인 행만 ALL. `profiles_select_job_post_owners`: 구인글 작성자 프로필만 SELECT(닉네임 등 공개용). `profiles_select_accepted_applicants`: 구인자→확정 지원자만. 이메일·전화는 본인 또는 “내가 확정한 지원자”만 노출. | **낮음** |
| **다른 사용자 구인글 수정·삭제** | 타인 글 ID로 `updateJobPost`, `closeJobPost` 등 호출 | 액션에서 `post.user_id === user.id` 검사. RLS `job_posts_update`: `auth.uid() = user_id`. | **낮음** |

**결론**: 개인정보·글 소유권은 RLS와 앱 검증으로 이중 방어되어 있어, 정상 경로로는 타인 정보 탈취·무단 수정이 어렵다.

---

### 1.2 인증·세션 우회

| 공격 목표 | 시나리오 | 현재 동작 | 위험도 |
|-----------|----------|-----------|--------|
| **OAuth 콜백 오픈 리다이렉트** | `/auth/callback?code=...&next=https://evil.com`로 로그인 후 피싱 사이트로 유도 | **수정함**: `next`가 `//`, `http://`, `https://`로 시작하거나 `..` 포함 시 `/onboarding`으로 고정. 경로가 `/`로 시작하지 않으면 `/onboarding`. | **해결** |
| **세션 고정/탈취** | 쿠키 탈취 또는 세션 하이재킹 | Supabase SSR: 쿠키 기반 세션. `httpOnly`·`secure`·`sameSite`는 Supabase/배포 설정에 따름. 앱 코드만으로 추가 조치 없음. | **중간** (배포·쿠키 설정 점검 권장) |
| **관리자 권한 탈취** | `profiles.role`을 `admin`으로 변경 | **수정함**: 마이그레이션 `034_profiles_prevent_role_update`: 트리거로 `role` 변경 시 예외 발생. admin/editor 부여는 DB·시드·관리 도구에서만 가능. | **해결** |

---

### 1.3 권한 상승·비즈니스 로직 우회

| 공격 목표 | 시나리오 | 현재 동작 | 위험도 |
|-----------|----------|-----------|--------|
| **노쇼 신고 자기 철회** | 피신고자가 `job_reports`를 직접 UPDATE해 `status='rescinded'`로 변경 | RLS `job_reports_update_own`: `reporter_id` 또는 `reported_user_id`면 UPDATE 허용. 따라서 피신고자도 **모든 컬럼** UPDATE 가능했음. | **높음 → 수정함** |
| **대응** | — | 마이그레이션 `033_job_reports_update_safe`: 트리거로 피신고자(`reported_user_id = auth.uid()`)가 `status`, `rescinded_at`을 변경하면 예외 발생. 피신고자는 `appealed_at`, `appeal_text`만 변경 가능. | **해결** |
| **타인 지원 확정** | 다른 구인자의 글에 대해 `confirm_application` RPC 호출 | RPC 인자 `p_owner_user_id`는 서버 액션에서 `user.id`(auth)로만 전달. RPC 내부에서 `job_posts.user_id = p_owner_user_id` 검사. | **낮음** |
| **관리자 전용 API 호출** | `/api/admin/refresh-market-benchmarks`, `/api/admin/fetch-g2b` 등에 일반 사용자로 POST | 각 라우트에서 `getUser()` 후 `profiles.role`이 admin/editor인지 검사. 비관리자면 403. | **낮음** |
| **관리자 전용 DB 작업** | categories, ugc, reports 등 관리자 테이블 직접 수정 | RLS에서 `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','editor'))`로 제한. | **낮음** |

---

### 1.4 API·인프라 악용

| 공격 목표 | 시나리오 | 현재 동작 | 위험도 |
|-----------|----------|-----------|--------|
| **Cron API 무단 호출** | `/api/cron/fetch-g2b`, `close-expired-job-posts` 등 POST로 마감·수집 트리거 | **수정함**: `CRON_SECRET`이 비어 있으면 무조건 401. 설정된 경우에만 `x-cron-secret`(또는 Bearer) 일치 시 실행. | **해결** |
| **서버 액션 DoS/스크래핑** | `getListingBenchmarks` 등 무한 호출로 DB·CPU 부하 | 인증 불필요. 목록/글쓰기 페이지에 노출된 액션을 반복 호출 가능. | **중간** (속도 제한·디바운스 권장) |
| **구인/리스팅 스팸** | 다량 글 등록으로 서비스 방해 | 구인: 1분 3건·10분 10건 제한. 리스팅은 별도 제한 없음. | **중간** (리스팅도 제한 검토) |
| **구독 유료 전환 무단** | `/api/subscribe/register`에 receipt 없이 호출해 subscription_plan=paid 획득 | billing_key 필수. receipt_id는 선택 검증. 실제 과금은 Bootpay 빌링키로 이후 차감되므로, 빌링키 유효성 검증·실패 시 paid 롤백 정책 권장. | **중간** (결제 검증 강화 권장) |

---

### 1.5 입력·데이터 무결성

| 공격 목표 | 시나리오 | 현재 동작 | 위험도 |
|-----------|----------|-----------|--------|
| **SQL 인젝션** | Supabase 클라이언트 쿼리에 사용자 입력 직접 concat | 파라미터화된 쿼리만 사용. ORM/클라이언트가 이스케이프 처리. | **낮음** |
| **XSS** | 글 제목·본문에 스크립트 삽입 | React 기본 이스케이프. 위험한 `dangerouslySetInnerHTML` 사용 여부는 코드 검토 필요. | **낮음** (사용처 점검 권장) |
| **Mass assignment** | 서버 액션에 `user_id`, `role` 등 전달 | 액션에서 필요한 필드만 추출하고, `user_id` 등은 서버에서 `auth.getUser()`로만 설정. | **낮음** |

---

## 2. 적용한 수정 사항 요약

1. **Auth callback 오픈 리다이렉트**  
   - `next` 검사: `//`, `http://`, `https://`, `..` 또는 비경로 시 `/onboarding`으로 고정.

2. **노쇼 신고 자기 철회 방지**  
   - `job_reports` UPDATE 시, 피신고자가 `status`/`rescinded_at`을 바꾸면 트리거로 예외 발생(마이그레이션 `033_job_reports_update_safe.sql`).

3. **profiles.role 변경 차단**  
   - 마이그레이션 `034_profiles_prevent_role_update`: UPDATE 시 `NEW.role != OLD.role`이면 예외. admin/editor 부여는 DB·시드에서만.

4. **목록 limit 상한**  
   - `/jobs`: `job_posts` 조회 시 `.limit(50)`.  
   - `/listings`: `.limit(50)` (기존 100 → 50).  
   - 추후 offset 사용 시 **offset ≤ 1000** 권장(대량 스캔 방지).

5. **SSRF 방지 + 외부 API 타임아웃**  
   - `lib/safe-fetch.ts`: `allowedHosts` 화이트리스트 검사, `AbortSignal.timeout(5000)`.  
   - G2B: `lib/g2b/client.ts`, `app/api/test-g2b/route.ts`에서 `safeFetch` + `G2B_ALLOWED_HOSTS` 사용.  
   - Bootpay: `lib/bootpay-server.ts`에서 SDK 호출을 `Promise.race`로 5초 타임아웃 적용.

6. **Cron API CRON_SECRET 필수**  
   - 모든 `/api/cron/*` 라우트: `CRON_SECRET`이 설정되지 않았거나 헤더 값이 일치하지 않으면 401. 비어 있을 때 검사 생략 제거.

7. **로그인/회원가입 경로 rate limit**  
   - `middleware.ts`: `/login`, `/signup`에 대해 IP당 1분에 30회 제한. 초과 시 429 + Retry-After. 실제 로그인 시도(signInWithPassword)는 Supabase로 직접 가므로, 페이지 접근·폼 로드 반복을 제한해 브루트포스·스캔 완화. 로그인 시도 횟수까지 제한하려면 Supabase Dashboard 설정 또는 로그인 프록시 API 검토.

---

## 3. 시스템 안전을 위한 구현 권장 사항

### 3.1 인증·세션

- **쿠키 옵션**: 프로덕션에서 쿠키 `secure: true`, `sameSite: 'lax'`(또는 필요 시 `strict`) 적용.
- **세션 만료**: Supabase Auth 설정에서 JWT/리프레시 만료 정책 확인.
- **admin 계정**: `profiles.role = 'admin'` 부여는 시드/마이그레이션 또는 관리자만 접근 가능한 내부 도구로만 수행. 일반 회원가입·프로필 수정 화면에서는 `role` 노출/변경 불가.

### 3.2 API·Cron

- **CRON_SECRET**: 모든 cron 라우트(`/api/cron/*`)에 대해 `CRON_SECRET` 환경 변수 필수 설정. 설정 시 비밀값이 없으면 401 반환하도록 할 수 있음(현재는 “설정된 경우에만” 검사).
- **Admin API**: 기존처럼 `getUser()` + `profiles.role` 검사 유지. 필요 시 IP 화이트리스트 추가 검토.

### 3.3 비즈니스 로직

- **확정·취소·노쇼**: 이미 RPC·트랜잭션으로 처리. 다른 중요 상태 변경도 가능한 한 RPC로 원자화.
- **리스팅/구인 생성**: 리스팅에도 “사용자당 N건/시간” 같은 속도 제한 도입 권장.
- **getListingBenchmarks**: 글쓰기 폼에서 디바운스 또는 “참고값 보기” 버튼으로 호출 횟수 제한.

### 3.4 RLS·DB

- **profiles**: 본인 행만 UPDATE 가능하므로, 클라이언트/폼에서 `role` 필드를 전송·수정하지 않도록 유지.
- **job_reports**: 피신고자는 트리거로 `status`/`rescinded_at` 변경 불가. 관리자 노쇼 철회는 기존처럼 액션에서만 수행(또는 관리자 전용 RPC).
- **민감 컬럼**: 이메일·전화·주소는 필요한 정책만 SELECT 허용(현재 정책 유지).

### 3.5 로깅·모니터링

- **감사 로그**: 확정·취소·노쇼 신고·노쇼 철회 등은 `job_application_events` 등으로 이벤트 기록 권장(이미 설계 문서에 반영).
- **실패 로그**: 로그인 실패, 403/401, cron 인증 실패 등을 로그에 남기면 추적에 유리.

### 3.6 배포·환경

- **환경 변수**: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `BOOTPAY_PRIVATE_KEY` 등은 **서버 전용**. **NEXT_PUBLIC_** 접두사로 노출 금지.
- **Dependency security**: `npm audit` 정기 실행, Dependabot/Snyk 등으로 취약 패키지 자동 탐지·업데이트.

---

## 4. 운영 보안 보완 포인트 (우선순위)

### 4.1 1단계 (즉시 적용) — 완료

- role DB 트리거 (`034`)
- limit 상한 (jobs/listings 50)
- offset 제한: 추후 페이지네이션 시 **offset ≤ 1000** 적용 권장
- SSRF host whitelist + external API timeout 5초

### 4.2 2단계 (다음)

- **audit_logs 테이블**: `id`, `request_id`, `user_id`, `action`, `target_type`, `target_id`, `ip`, `user_agent`, `created_at`, `metadata`. `request_id`로 nginx/Vercel/앱/DB 로그 연계.
- **XSS**: 사용자 입력(title, description, notes 등)은 **출력 직전** sanitize 권장(데이터 손실 없음). DOMPurify / sanitize-html. `dangerouslySetInnerHTML`·마크다운 렌더 구간 점검.
- **Rate limit (간단)**: `user_request_logs` 테이블로 최근 1분 count → 과다 시 차단. 이후 Redis → Cloudflare 순으로 확장.

### 4.3 3단계

- Redis 기반 Rate limit (API 1분 60회, 구인 5분 5건 등).
- 목록 CDN/Edge cache.

### 4.4 4단계

- 캡차(Cloudflare Turnstile 등): 회원가입·구인·리스팅 등. (Rate limit 적용 후 도입 권장.)
- CSP: `Content-Security-Policy` 헤더로 script-src, img-src 등 제한.

---

## 5. 한 줄 요약

- **개인정보·소유권**: RLS + 앱 검증으로 이중 방어.
- **오픈 리다이렉트**: auth callback의 `next` 검사로 차단.
- **노쇼 자기 철회**: `job_reports` 트리거로 피신고자의 status/rescinded 변경 차단.
- **role 상승**: `profiles` 트리거로 role 변경 차단.
- **목록 DoS**: limit 50, offset 상한(1000) 권장.
- **SSRF·외부 API**: safeFetch 화이트리스트 + 5초 타임아웃.
- **Cron·Admin**: CRON_SECRET 필수화, admin은 role 기반 + RLS 유지.
- **추가 강화**: Rate limit(DB → Redis → CDN), audit_logs(request_id), XSS 출력 전 sanitize, Dependency security(npm audit/Dependabot), 캡차·CSP.

이 문서는 코드·마이그레이션 기준으로 작성된 점검 결과이며, 실제 침투 테스트·운영 환경 점검과 병행하는 것을 권장합니다.
