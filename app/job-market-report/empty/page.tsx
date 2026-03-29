import Link from "next/link";

export default function JobMarketReportEmptyPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-slate-900">구인 일당 리포트 준비 중</h1>
      <p className="mt-3 text-sm text-slate-600">
        아직 발행된 스냅샷이 없습니다. Supabase에 마이그레이션을 적용한 뒤 관리자{" "}
        <Link href="/admin/job-wage-report" className="font-medium text-blue-600 hover:underline">
          일당 리포트
        </Link>
        에서 수동 집계를 실행해 주세요.
      </p>
      <Link href="/jobs" className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline">
        인력 구인으로
      </Link>
    </div>
  );
}
