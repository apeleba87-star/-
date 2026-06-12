export default function PublicJobsLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="h-9 w-2/3 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-3 h-5 w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-5 h-12 animate-pulse rounded-xl bg-slate-100" />
      <div className="mt-5 h-14 animate-pulse rounded-xl bg-slate-100" />
      <div className="mt-6 h-10 animate-pulse rounded-xl bg-slate-100" />
      <div className="mt-4 space-y-1 rounded-xl border border-slate-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse border-b border-slate-50 bg-slate-50/80 last:border-0" />
        ))}
      </div>
    </main>
  );
}
