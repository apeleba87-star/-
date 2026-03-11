import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import RescindNoShowButton from "./RescindNoShowButton";

const REASON_SUBTYPE_LABELS: Record<string, string> = {
  no_show_absent: "당일 무단 결근(노쇼)",
  no_show_left: "업무 중간 이탈(노쇼)",
  no_show_other: "기타",
};

export default async function AdminJobReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filterUserId = typeof params.reported_user_id === "string" ? params.reported_user_id : null;
  const filterAppealed = params.filter_appealed === "1";

  const supabase = await createServerSupabase();

  const { data: allNoShowForCount } = await supabase
    .from("job_reports")
    .select("reported_user_id")
    .eq("reason_type", "no_show")
    .neq("status", "rescinded");
  const countByReported = new Map<string, number>();
  for (const r of allNoShowForCount ?? []) {
    countByReported.set(r.reported_user_id, (countByReported.get(r.reported_user_id) ?? 0) + 1);
  }
  const usersWith4Plus = [...countByReported.entries()].filter(([, cnt]) => cnt >= 4).sort((a, b) => b[1] - a[1]);

  let q = supabase
    .from("job_reports")
    .select("id, job_application_id, reporter_id, reported_user_id, reason_type, reason_subtype, reason_text, status, created_at, appealed_at, appeal_text")
    .eq("reason_type", "no_show")
    .order("created_at", { ascending: false });

  if (filterUserId) q = q.eq("reported_user_id", filterUserId);
  if (filterAppealed) q = q.eq("status", "open").not("appealed_at", "is", null);

  const { data: reports } = await q;

  const allReportedIds = new Set<string>();
  const allReporterIds = new Set<string>();
  for (const r of reports ?? []) {
    allReportedIds.add(r.reported_user_id);
    allReporterIds.add(r.reporter_id);
  }
  const userIds = [...new Set([...allReportedIds, ...allReporterIds, ...usersWith4Plus.map(([u]) => u)])];

  const { data: workers } = await supabase
    .from("worker_profiles")
    .select("user_id, nickname")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const nicknameByUser = new Map<string, string>();
  for (const w of workers ?? []) {
    nicknameByUser.set(w.user_id, (w.nickname || "").trim() || "(닉네임 없음)");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">노쇼 신고 기록</h1>

      <section className="mb-8 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
        <h2 className="text-lg font-semibold text-slate-800">노쇼 4회 이상 누적 사용자</h2>
        <p className="mt-1 text-sm text-slate-500">전체 기간 누적 기준. 클릭 시 해당 사용자 신고만 필터.</p>
        {usersWith4Plus.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">해당 사용자가 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {usersWith4Plus.map(([userId, count]) => (
              <li key={userId}>
                <Link
                  href={filterUserId === userId ? "/admin/job-reports" : `/admin/job-reports?reported_user_id=${userId}`}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${filterUserId === userId ? "bg-amber-200 text-amber-900" : "bg-white text-slate-700 shadow-sm hover:bg-amber-50"}`}
                >
                  <span>{nicknameByUser.get(userId) ?? userId.slice(0, 8)}</span>
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">총 {count}회</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-800">
            {filterAppealed ? "이의 제기된 건" : filterUserId ? "해당 사용자 신고 목록" : "전체 노쇼 신고 기록"}
          </h2>
          <div className="flex items-center gap-2">
            {filterAppealed ? (
              <Link
                href={"/admin/job-reports" + (filterUserId ? `?reported_user_id=${filterUserId}` : "")}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                전체 보기
              </Link>
            ) : (
              <Link
                href={"/admin/job-reports?filter_appealed=1" + (filterUserId ? `&reported_user_id=${filterUserId}` : "")}
                className="rounded-lg px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                이의 제기된 건만 보기
              </Link>
            )}
            {filterUserId && (
              <Link href={filterAppealed ? "/admin/job-reports?filter_appealed=1" : "/admin/job-reports"} className="text-sm text-blue-600 hover:underline">
                필터 해제
              </Link>
            )}
          </div>
        </div>
        {!reports?.length ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            {filterAppealed ? "이의 제기된 노쇼 신고가 없습니다." : "노쇼 신고 기록이 없습니다."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-700">날짜</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">피신고자</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">신고자</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">사유</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">상세</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">이의 일시</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">이의 사유</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">상태</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">조치</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(r.created_at).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{nicknameByUser.get(r.reported_user_id) ?? r.reported_user_id.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{nicknameByUser.get(r.reporter_id) ?? r.reporter_id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {REASON_SUBTYPE_LABELS[r.reason_subtype ?? ""] ?? r.reason_subtype ?? "—"}
                      </span>
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-slate-500">{r.reason_text || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.appealed_at ? new Date(r.appealed_at).toLocaleString("ko-KR") : "—"}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-500" title={r.appeal_text ?? undefined}>
                      {r.appeal_text || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${r.status === "rescinded" ? "bg-slate-200 text-slate-600" : r.status === "open" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                        {r.status === "rescinded" ? "철회됨" : r.status === "open" ? "검토중" : r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "open" ? <RescindNoShowButton reportId={r.id} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
