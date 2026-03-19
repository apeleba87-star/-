export default function PostLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-6">
      <div className="mb-6 h-14 w-full animate-pulse rounded-2xl bg-slate-200" />
      <div className="h-28 w-full animate-pulse rounded-2xl bg-slate-100" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
    </div>
  );
}

