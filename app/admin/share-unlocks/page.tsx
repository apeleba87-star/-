import Link from "next/link";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ action?: string; date?: string }>;

async function getLogs(filters: { action?: string; date?: string }) {
  const supabase = createServiceSupabase();
  let q = supabase
    .from("daily_share_unlock_logs")
    .select("id, user_id, date_kst, action, channel, ip_hash, user_agent, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters.action && ["grant", "consume", "consume_blocked"].includes(filters.action)) {
    q = q.eq("action", filters.action);
  }
  if (filters.date) q = q.eq("date_kst", filters.date);

  const { data, error } = await q;
  if (error) return { list: [], error: error.message };

  const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", userIds);
  const emailById = new Map((profiles ?? []).map((p) => [p.id, (p as { email?: string }).email ?? "—"]));

  return {
    list: (data ?? []).map((r) => ({ ...r, email: emailById.get(r.user_id) ?? "—" })),
    error: null as string | null,
  };
}

export default async function AdminShareUnlocksPage({ searchParams }: { searchParams: SearchParams }) {
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) return <p className="text-red-600">로그인이 필요합니다.</p>;

  const { data: profile } = await authSupabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") return <p className="text-red-600">권한이 없습니다.</p>;

  const params = await searchParams;
  const { list, error } = await getLogs({ action: params.action, date: params.date });
  const today = new Date().toISOString().slice(0, 10);
  const blockedCount = list.filter((r) => r.action === "consume_blocked").length;
  const consumeTotal = list.filter((r) => r.action === "consume" || r.action === "consume_blocked").length;
  const blockedRate = consumeTotal > 0 ? Math.round((blockedCount / consumeTotal) * 1000) / 10 : 0;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">공유 열람권 로그</h1>
      <p className="mb-4 text-sm text-slate-600">무료 사용자 공유/소모/차단 이력을 확인합니다.</p>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">조회 로그 수</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{list.length}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-700">차단 건수</p>
          <p className="mt-1 text-xl font-semibold text-amber-900">{blockedCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs text-emerald-700">차단 비율</p>
          <p className="mt-1 text-xl font-semibold text-emerald-900">{blockedRate}%</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/share-unlocks" className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!params.action ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
          전체
        </Link>
        <Link href="/admin/share-unlocks?action=grant" className={`rounded-lg px-3 py-1.5 text-sm font-medium ${params.action === "grant" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
          grant
        </Link>
        <Link href="/admin/share-unlocks?action=consume" className={`rounded-lg px-3 py-1.5 text-sm font-medium ${params.action === "consume" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
          consume
        </Link>
        <Link href="/admin/share-unlocks?action=consume_blocked" className={`rounded-lg px-3 py-1.5 text-sm font-medium ${params.action === "consume_blocked" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
          consume_blocked
        </Link>
        <Link href={`/admin/share-unlocks?date=${today}`} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${params.date === today ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
          오늘
        </Link>
      </div>

      {error && <p className="mb-3 text-red-600">목록 조회 실패: {error}</p>}
      {params.date && (
        <p className="mb-3 text-sm text-slate-600">
          날짜 필터: <span className="font-medium text-slate-800">{params.date}</span>{" "}
          <Link href={`/admin/share-unlocks${params.action ? `?action=${params.action}` : ""}`} className="text-blue-600 hover:underline">
            해제
          </Link>
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-semibold text-slate-700">시간</th>
              <th className="px-4 py-3 font-semibold text-slate-700">이메일</th>
              <th className="px-4 py-3 font-semibold text-slate-700">action</th>
              <th className="px-4 py-3 font-semibold text-slate-700">channel</th>
              <th className="px-4 py-3 font-semibold text-slate-700">date_kst</th>
              <th className="px-4 py-3 font-semibold text-slate-700">ip_hash</th>
              <th className="px-4 py-3 font-semibold text-slate-700">detail</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">로그가 없습니다.</td>
              </tr>
            ) : (
              list.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{new Date(r.created_at).toLocaleString("ko-KR")}</td>
                  <td className="max-w-[220px] truncate px-4 py-2.5 text-slate-800" title={String(r.email)}>{r.email}</td>
                  <td className="px-4 py-2.5 text-slate-700">{r.action}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.channel}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.date_kst}</td>
                  <td className="max-w-[220px] truncate px-4 py-2.5 text-slate-500" title={r.ip_hash ?? "—"}>{r.ip_hash ?? "—"}</td>
                  <td className="max-w-[300px] px-4 py-2.5 text-xs text-slate-500">
                    <details>
                      <summary className="cursor-pointer select-none text-slate-600">보기</summary>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-2">{JSON.stringify(r.detail ?? {}, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

