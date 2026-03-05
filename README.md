# Newslett

Next.js + Supabase + Tailwind CSS 기반 웹앱 프로젝트입니다.

## 요구 사항

- **Node.js** 18.18 이상 (LTS 권장)  
  - [nodejs.org](https://nodejs.org/)에서 설치

## 개발 환경 실행

1. **Node.js 설치**  
   [nodejs.org](https://nodejs.org/)에서 LTS 버전 다운로드 후 설치합니다.

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **Supabase 환경 변수 설정**  
   `.env.local` 파일에 Supabase 프로젝트 값을 넣습니다.
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```  
   값은 [Supabase 대시보드](https://supabase.com/dashboard) → 프로젝트 → Settings → API에서 확인할 수 있습니다.  
   (연동 전까지는 빈 값으로 두어도 앱 실행은 가능합니다.)

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```

5. **DB 스키마 적용 (최초 1회)**  
   Supabase 대시보드 → **SQL Editor**에서 아래 순서로 실행합니다.  
   - `supabase/migrations/001_initial_schema.sql`  
   - `supabase/migrations/002_g2b_tenders.sql` (나라장터 입찰·계약·키워드 테이블)  
   - `supabase/migrations/003_clean_related.sql` (청소 관련 필터 컬럼)  
   - `supabase/migrations/004_tender_keywords_type.sql` (키워드 구분: 포함/제외)  
   - `supabase/migrations/005_tender_categories.sql` (업종: 청소/소독·방역, tenders.categories)

6. **관리자 로그인 설정**  
   - **회원가입:** 브라우저에서 [http://localhost:3001/signup](http://localhost:3001/signup) 접속 후 이메일·비밀번호로 가입  
   - **관리자 지정:** Supabase 대시보드 → **SQL Editor**에서 `supabase/set_admin.sql` 내용 실행 (이메일을 본인 주소로 수정 가능)  
   - **로그인:** [http://localhost:3001/login](http://localhost:3001/login) 에서 로그인 후 [http://localhost:3001/admin](http://localhost:3001/admin) 접속

7. 브라우저에서 [http://localhost:3001](http://localhost:3001) 으로 접속합니다.

## 나라장터(G2B) 입찰 공고 수집

- **API**: [공공데이터포털 - 조달청 나라장터 입찰공고정보서비스](https://www.data.go.kr/data/15129394/openapi.do) 활용신청 후 인증키(Encoding) 발급  
- **환경변수**: `.env.local`에 `DATA_GO_KR_SERVICE_KEY=발급받은_인증키` 추가  
- **수집**: 30분~1시간마다 `POST /api/cron/fetch-g2b` 호출 (헤더 `x-cron-secret`에 `CRON_SECRET` 값 전달).  
  Vercel Cron 등에서 예약 호출하거나, 수동으로 호출해도 됩니다.  
- **키워드**: 청소·미화·위생 등은 `tender_keywords` 테이블에 있으며, 관리자 페이지에서 추후 수정 가능하도록 확장할 수 있습니다.  
- **화면**: [입찰 공고](http://localhost:3001/tenders), [입찰 대시보드](http://localhost:3001/tenders/dashboard), [공고 상세](/tenders/[id]), [계약](/contracts)  
- **업종별 필터**: 입찰 키워드를 **청소 관련** / **소독·방역 관련**으로 구분. 공고는 `tenders.categories` 배열에 매칭된 업종(cleaning, disinfection) 저장. 사용자 검색: **청소만** / **소독·방역만** / **청소+소독·방역** / **전체** 선택 가능.  
- **관리자 키워드**: [관리자 → 입찰 키워드](/admin/tender-keywords)에서 포함(업종: 청소·소독·방역)·제외(공통) 단어 추가·수정·삭제.  
- **백필**: 키워드 변경 후 기존 공고에 반영하려면 관리자 페이지의 "키워드 반영" 버튼 또는 `POST /api/cron/backfill-clean-score` 호출.

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (Hot Reload) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드된 앱 실행 |
| `npm run lint` | ESLint 실행 |

## 폴더 구조

```
├── app/                  # Next.js App Router
│   ├── admin/            # 관리자 (글, 뉴스레터 큐, UGC 검수, 신고, 광고)
│   ├── api/              # API (뉴스레터 발송, cron, 인증)
│   ├── archive/          # 뉴스레터 아카이브
│   ├── categories/       # 카테고리·글 목록
│   ├── posts/            # 글 상세
│   ├── ugc/              # 현장·후기 목록·쓰기
│   ├── login, signup/
├── components/
├── lib/                   # Supabase 클라이언트, 타입
├── supabase/migrations/   # DB 스키마 (Supabase SQL Editor에서 실행)
└── .env.local
```

## Supabase 연동 방법

### 1단계: Supabase 프로젝트 만들기

1. [Supabase](https://supabase.com) 접속 후 **Sign in** (GitHub 등으로 로그인 가능).
2. **New project** 클릭.
3. **Organization** 선택(없으면 새로 생성).
4. **Project name** 입력 (예: `newslett`).
5. **Database Password** 설정 후 저장해 두기.
6. **Region** 선택 후 **Create new project** 클릭.
7. 프로젝트가 준비될 때까지 1~2분 대기.

### 2단계: API 키 복사하기

1. 왼쪽 메뉴에서 **Project Settings**(톱니바퀴) 클릭.
2. **API** 메뉴 선택.
3. 아래 두 값을 복사:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`에 넣을 값
   - **anon public** 키 (API Keys 영역) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 넣을 값

### 3단계: 프로젝트에 환경 변수 넣기

프로젝트 루트의 **`.env.local`** 파일을 열고 다음처럼 입력(복사한 값으로 교체):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- `xxxxxxxx` 부분은 본인 프로젝트 URL에 맞게.
- **anon public** 키는 긴 JWT 문자열입니다.  
저장 후 개발 서버를 다시 실행하면 연동이 적용됩니다.

### 4단계: 코드에서 사용하기

**클라이언트 컴포넌트** (브라우저):

```tsx
"use client";
import { createClient } from "@/lib/supabase";

const supabase = createClient();
// 예: const { data } = await supabase.from("테이블명").select();
```

**서버 컴포넌트 / API 라우트**:

```tsx
import { createClient } from "@/lib/supabase-server";

const supabase = createClient();
// 예: const { data } = await supabase.from("테이블명").select();
```

- DB 테이블은 Supabase 대시보드 **Table Editor**에서 생성·수정합니다.
- 인증(로그인 등)을 쓰려면 **Authentication** 메뉴에서 설정한 뒤, 필요 시 `@supabase/ssr` 기반으로 쿠키 연동을 추가하면 됩니다.

---

## 기술 스택

- **프론트엔드**: Next.js 15 (React 19), Tailwind CSS
- **백엔드/DB**: Supabase
- **패키지 매니저**: npm
