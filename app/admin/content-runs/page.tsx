import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";

export default async function AdminContentRunsPage() {
  const supabase = await createServerSupabase();
  const { data: runs } = await supabase
    .from("content_generation_runs")
    .select("id, run_type, run_key, status, source_count, generated_post_id, error_message, attempt_count, started_at, finished_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const statusLabel: Record<string, string> = {
    success: "성공",
    failed: "실패",
    skipped: "건너뜀",
    pending: "대기",
  };
  const statusClass: Record<string, string> = {
    success: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    skipped: "bg-slate-100 text-slate-600",
    pending: "bg-amber-100 text-amber-800",
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">자동 생성 로그</h1>
        <Link href="/admin/posts?filter=auto_drafts" className="text-sm text-blue-600 hover:underline">
          자동 생성 초안 목록 →
        </Link>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        일간 입찰 리포트 등 자동 콘텐츠 생성 실행 이력입니다. 실패 시 error_message를 확인하세요.
      </p>
      {!runs?.length ? (
        <div className="card">
          <p className="text-slate-500">실행 이력이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse rounded-lg border border-slate-200 bg-white text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 font-medium text-slate-700">run_key</th>
                <th className="p-3 font-medium text-slate-700">타입</th>
                <th className="p-3 font-medium text-slate-700">상태</th>
                <th className="p-3 font-medium text-slate-700">건수</th>
                <th className="p-3 font-medium text-slate-700">시도</th>
                <th className="p-3 font-medium text-slate-700">실행 시각</th>
                <th className="p-3 font-medium text-slate-700">글</th>
                <th className="p-3 font-medium text-slate-700">오류</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-slate-100">
                  <td className="p-3 font-mono text-slate-700">{run.run_key}</td>
                  <td className="p-3 text-slate-600">{run.run_type}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusClass[run.status] ?? "bg-slate-100"}`}
                    >
                      {statusLabel[run.status] ?? run.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{run.source_count ?? "—"}</td>
                  <td className="p-3 text-slate-600">{run.attempt_count ?? 0}</td>
                  <td className="p-3 text-slate-600">
                    {run.started_at
                      ? new Date(run.started_at).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="p-3">
                    {run.generated_post_id ? (
                      <Link
                        href={`/admin/posts/${run.generated_post_id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        글 보기
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-xs p-3 text-red-600">
                    {run.error_message ? (
                      <span className="truncate" title={run.error_message}>
                        {run.error_message}
                      </span>
                    ) : (
                      "—"
                    )}
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
