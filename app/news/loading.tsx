export default function NewsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6 h-10 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mb-8 h-8 w-80 animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-white p-5 shadow-sm">
            <div className="h-4 w-3/4 rounded bg-slate-200" />
            <div className="mt-3 h-3 w-5/6 rounded bg-slate-200" />
            <div className="mt-4 h-3 w-2/3 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

