import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";

export default async function AdminReportsPage() {
  const supabase = await createServerSupabase();
  const { data: reports } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">신고 관리</h1>
      {!reports?.length ? (
        <div className="card">
          <p className="text-slate-500">신고된 항목이 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {r.target_type}
                </span>
                <span className="ml-2 text-slate-700">ID: {r.target_id}</span>
                {r.reason && <p className="mt-1 text-sm text-slate-600">{r.reason}</p>}
                <span className="mt-1 inline-block text-xs text-slate-500">
                  상태: {r.status} · {new Date(r.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <Link href={r.target_type === "ugc" ? `/ugc/${r.target_id}` : "#"} className="text-sm text-blue-600 hover:underline">
                보기
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
