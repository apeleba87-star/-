export default function JobsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8 animate-pulse">
      <div className="mb-2 h-10 w-10 rounded-xl bg-slate-200" />
      <div className="h-7 w-32 rounded bg-slate-200" />
      <div className="mt-1 h-4 w-48 rounded bg-slate-100" />
      <div className="mt-4 h-12 w-full rounded-xl bg-slate-100" />
      <div className="mt-4 h-12 w-full rounded-xl bg-slate-100" />
      <ul className="mt-6 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <li key={i} className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="h-5 w-3/4 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-1/2 rounded bg-slate-100" />
            <div className="mt-3 flex gap-2">
              <div className="h-6 w-16 rounded bg-slate-100" />
              <div className="h-6 w-20 rounded bg-slate-100" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
