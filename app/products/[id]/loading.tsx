export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-6 sm:py-8" aria-busy="true" aria-label="제품 불러오는 중">
      <div className="mb-4 h-3 w-40 rounded bg-slate-200" />
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-4">
        <div className="mx-auto h-48 max-w-xs rounded-xl bg-white/70" />
        <div className="mx-auto mt-4 h-7 w-2/3 rounded bg-slate-200/80" />
        <div className="mx-auto mt-2 h-4 w-1/2 rounded bg-slate-200/60" />
      </div>
      <div className="mb-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-20 shrink-0 rounded-full bg-slate-200" />
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
        <div className="h-5 w-1/3 rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-5/6 rounded bg-slate-100" />
        <div className="h-4 w-2/3 rounded bg-slate-100" />
      </div>
    </div>
  );
}
