/**
 * 루트(홈) 로딩 시 즉시 표시 — 클릭 반응성 확보, 연타·이탈 완화
 */
export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100" />
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5" />
          ))}
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5" />
          ))}
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="h-32 animate-pulse rounded-2xl border border-slate-200/80 bg-emerald-50/50 p-5" />
          <div className="h-32 animate-pulse rounded-2xl border border-slate-200/80 bg-blue-50/50 p-5" />
        </section>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 pb-10 sm:px-6 sm:pb-12">
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-slate-100" />
        <div className="mt-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white border border-slate-200/80" />
          ))}
        </div>
      </div>
    </div>
  );
}
