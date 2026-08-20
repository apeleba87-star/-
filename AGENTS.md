# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is
- **Primary product (repo root):** a Next.js 16 (App Router, React 19, TypeScript) web app — 클린아이덱스 / Cleanidex, a Korean cleaning-methods knowledge + marketplace platform. Package manager is **npm** (`package-lock.json`). This is what you develop/run by default.
- **Optional secondary products:** two Flutter apps under `magam_app/` and `cleanidex_app/`. They require the Flutter SDK (not installed by the startup script) and are independent mobile products; only set them up if a task specifically targets them.
- Backend is a **hosted Supabase** project (Postgres + Auth + Storage). There is no local Supabase/Docker config in this repo; DB schema lives as raw SQL in `supabase/migrations/` and is applied manually via the Supabase dashboard.

### Running the web app (dev)
- Dev server: `npm run dev` → serves on **http://localhost:3001** (Turbopack; hardcoded port in `package.json`). `npm run dev:webpack` is the webpack fallback.
- The `middleware` deprecation warning on startup ("use proxy instead") is harmless.

### Supabase env is required for the client bundle to boot (non-obvious)
- `.env.local` is git-ignored, so it does not exist on a fresh VM — recreate it if missing.
- The browser client `lib/supabase.ts` calls `createBrowserClient(url!, key!)`, which **throws when the vars are empty**. A client component in the root layout (`components/auth/SupabaseSessionRefresh.tsx`) runs on every page, so empty Supabase vars crash the whole client-side app (blank/error page) even though SSR/curl of a page may still return 200.
- To run the static knowledge-hub locally **without a real Supabase project**, put syntactically valid *placeholder* values in `.env.local`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
  ```
  `getSession()` reads local storage only (no network), so the find-by-pollution/material/product/equipment/place pages and guide search work fully offline. Any feature that actually queries the DB or auth (admin, subscriptions, tenders/jobs/demand data, etc.) needs a **real** Supabase project (set the real URL/anon key, plus `SUPABASE_SERVICE_ROLE_KEY` for cron writes) with the `supabase/migrations/` applied. All other third-party API keys in `.env.example` (나라장터/G2B, Worknet, Naver, MOLIT, Bootpay, Coupang, Kakao, Upstash) are optional and gate individual features/cron jobs only.

### Linting (non-obvious — the documented command is broken)
- `npm run lint` (= `next lint`) does **not** work: `next lint` was removed in Next 16, and the legacy `.eslintrc.json` is incompatible with ESLint 9.
- Lint via the committed flat config instead: **`npx eslint .`** (uses `eslint.config.mjs`, which re-exports `eslint-config-next`'s flat `core-web-vitals` + `typescript` configs). Flat config takes precedence over the stale `.eslintrc.json`.
- Note: the existing codebase currently has ~80 pre-existing ESLint errors + ~110 warnings; those are not caused by environment setup.

### Build / test
- No automated test suite exists in this repo (no test runner configured).
- Production build is `npm run build` (webpack). For local development prefer `npm run dev`; a full production build isn't needed to work on the app.
