export default function PublicJobsLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-4 h-6 w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </main>
  );
}
