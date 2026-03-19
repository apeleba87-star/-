import { createServerSupabase } from "@/lib/supabase-server";
import { createServiceSupabase } from "@/lib/supabase-server";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "구독 중",
  cancelled: "취소 예정/완료",
  past_due: "결제 실패",
};

async function getSubscriptions(filters: { status?: string; filter?: string }) {
  const supabase = createServiceSupabase();
  const today = new Date().toISOString().slice(0, 10);

  let q = supabase
    .from("subscriptions")
    .select("id, user_id, status, next_billing_at, amount_cents, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters.status && ["active", "cancelled", "past_due"].includes(filters.status)) {
    q = q.eq("status", filters.status);
  }
  if (filters.filter === "cancel_scheduled") {
    q = q.eq("status", "cancelled").gt("next_billing_at", today);
  }

  const { data: subs, error } = await q;
  if (error) return { list: [], error: error.message };

  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", userIds);
  const emailById = new Map((profiles ?? []).map((p) => [p.id, (p as { email?: string }).email]));

  const list = (subs ?? []).map((s) => ({
    ...s,
    email: emailById.get(s.user_id) ?? "—",
  }));

  return { list, error: null };
}

type SearchParams = Promise<{ status?: string; filter?: string }>;

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: SearchParams }) {
  const authSupabase = await createServerSupabase();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return <p className="text-red-600">로그인이 필요합니다.</p>;

  const { data: profile } = await authSupabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return <p className="text-red-600">권한이 없습니다.</p>;
  }

  const params = await searchParams;
  const { list, error } = await getSubscriptions({
    status: params.status,
    filter: params.filter,
  });

  if (error) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">구독 관리</h1>
        <p className="text-red-600">목록을 불러올 수 없습니다: {error}</p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">구독 관리</h1>
      <p className="mb-4 text-sm text-slate-600">
        status, next_billing_at 기준 조회. 취소 예정 = cancelled 이면서 다음 결제일이 미래인 건.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/subscriptions"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!params.status && !params.filter ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          전체
        </Link>
        <Link
          href="/admin/subscriptions?status=active"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${params.status === "active" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          구독 중
        </Link>
        <Link
          href="/admin/subscriptions?filter=cancel_scheduled"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${params.filter === "cancel_scheduled" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          취소 예정
        </Link>
        <Link
          href="/admin/subscriptions?status=cancelled"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${params.status === "cancelled" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          취소됨
        </Link>
        <Link
          href="/admin/subscriptions?status=past_due"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${params.status === "past_due" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          결제 실패
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-semibold text-slate-700">이메일</th>
              <th className="px-4 py-3 font-semibold text-slate-700">상태</th>
              <th className="px-4 py-3 font-semibold text-slate-700">다음 결제일</th>
              <th className="px-4 py-3 font-semibold text-slate-700">금액</th>
              <th className="px-4 py-3 font-semibold text-slate-700">생성</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  조건에 맞는 구독이 없습니다.
                </td>
              </tr>
            ) : (
              list.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="max-w-[200px] truncate px-4 py-2.5 text-slate-800" title={String(s.email)}>
                    {s.email}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        s.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : s.status === "cancelled"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {s.next_billing_at}
                    {s.status === "cancelled" && s.next_billing_at && s.next_billing_at > today && (
                      <span className="ml-1 text-xs text-amber-600">까지 이용</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {s.amount_cents != null ? (s.amount_cents / 100).toLocaleString() + "원" : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                    {s.created_at
                      ? new Date(s.created_at).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                      : "—"}
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
