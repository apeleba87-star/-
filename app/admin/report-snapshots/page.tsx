import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { getReportTypeLabel } from "@/lib/content/report-snapshot-types";
import PublishButton from "./PublishButton";

export default async function AdminReportSnapshotsPage() {
  const supabase = await createServerSupabase();

  const { data: snapshots } = await supabase
    .from("report_snapshots")
    .select("id, report_type, period_key, title, content_social, published_post_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">리포트 스냅샷</h1>
        <p className="text-sm text-slate-600">
          자동 생성 로그에서 &quot;리포트 생성&quot; 실행 시 여기에 스냅샷이 쌓입니다. 글 발행 시 사이트에 글로 노출되며,
          표기는 &quot;주간시장요약 리포트&quot; 등 유형명으로 됩니다.
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        <Link href="/admin/content-runs" className="text-sm text-blue-600 hover:underline">
          자동 생성 로그 →
        </Link>
      </div>

      {!snapshots?.length ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
          <p>아직 스냅샷이 없습니다.</p>
          <p className="mt-1 text-sm">자동 생성 로그에서 &quot;지금 일간 리포트 생성&quot;을 실행하면 주간 시장 요약 등이 여기에 생성됩니다.</p>
          <p className="mt-3 text-xs text-slate-500">
            생성 후에도 비어 있다면 Supabase에 마이그레이션 <code className="rounded bg-slate-200 px-1">070_report_snapshots.sql</code> 적용 여부를 확인하세요. 적용 후 다시 리포트 생성을 실행하면 스냅샷이 쌓입니다.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 font-medium text-slate-700">유형</th>
                <th className="p-3 font-medium text-slate-700">기간</th>
                <th className="p-3 font-medium text-slate-700">제목</th>
                <th className="p-3 font-medium text-slate-700">생성일</th>
                <th className="p-3 font-medium text-slate-700">글 발행</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="p-3">
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {getReportTypeLabel(row.report_type)}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-600">{row.period_key}</td>
                  <td className="max-w-xs p-3">
                    <span className="truncate font-medium text-slate-800" title={row.title}>
                      {row.title}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="p-3">
                    <PublishButton snapshotId={row.id} publishedPostId={row.published_post_id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
