export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
          <p className="text-sm text-slate-500">관리자 페이지 불러오는 중…</p>
        </div>
      </div>
    </div>
  );
}
