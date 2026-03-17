import { homeDashboardCardClass } from "./home-section-styles";

/** Suspense fallback: 내 구인·지원 영역 스켈레톤 */
export default function HomeUserStatsSkeleton() {
  return (
    <section className="mb-8 grid gap-4 sm:grid-cols-2">
      <div className={`${homeDashboardCardClass} flex h-full flex-col border-emerald-200 bg-emerald-50/50`}>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 animate-pulse rounded-lg bg-emerald-200" />
          <span className="h-5 w-24 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="mt-2 h-4 w-20 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 flex gap-4">
          <span className="h-4 w-16 animate-pulse rounded bg-slate-100" />
          <span className="h-4 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className={`${homeDashboardCardClass} flex h-full flex-col border-blue-200 bg-blue-50/50`}>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 animate-pulse rounded-lg bg-blue-200" />
          <span className="h-5 w-28 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="mt-2 h-4 w-20 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-4 w-32 animate-pulse rounded bg-slate-100" />
      </div>
    </section>
  );
}
