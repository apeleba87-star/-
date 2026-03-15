import { createServerSupabase } from "@/lib/supabase-server";

const ROLE_LABEL: Record<string, string> = {
  subscriber: "구독자",
  editor: "에디터",
  admin: "관리자",
};

const PLAN_LABEL: Record<string, string> = {
  free: "무료",
  paid: "유료",
};

export default async function AdminUsersPage() {
  const supabase = await createServerSupabase();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, subscription_plan, phone, onboarding_done, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">사용자 관리</h1>
        <p className="text-red-600">목록을 불러올 수 없습니다: {error.message}</p>
      </div>
    );
  }

  const list = profiles ?? [];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">사용자 관리</h1>
      <p className="mb-6 text-sm text-slate-600">
        가입된 회원 목록입니다. 이메일·닉네임·역할·가입일 등을 확인할 수 있습니다.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-semibold text-slate-700">가입일</th>
              <th className="px-4 py-3 font-semibold text-slate-700">이메일</th>
              <th className="px-4 py-3 font-semibold text-slate-700">닉네임</th>
              <th className="px-4 py-3 font-semibold text-slate-700">역할</th>
              <th className="px-4 py-3 font-semibold text-slate-700">구독</th>
              <th className="px-4 py-3 font-semibold text-slate-700">온보딩</th>
              <th className="px-4 py-3 font-semibold text-slate-700">연락처</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  등록된 사용자가 없습니다.
                </td>
              </tr>
            ) : (
              list.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {p.created_at
                      ? new Date(p.created_at).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-2.5 text-slate-800" title={p.email ?? ""}>
                    {p.email ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-800">{p.display_name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        p.role === "admin"
                          ? "bg-amber-100 text-amber-800"
                          : p.role === "editor"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {ROLE_LABEL[p.role] ?? p.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{PLAN_LABEL[p.subscription_plan] ?? p.subscription_plan}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.onboarding_done ? "완료" : "미완료"}</td>
                  <td className="max-w-[140px] truncate px-4 py-2.5 text-slate-600" title={p.phone ?? ""}>
                    {p.phone ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {list.length >= 500 && (
        <p className="mt-3 text-xs text-slate-500">최근 500명만 표시됩니다. 더 보려면 검색/필터 기능을 추가할 수 있습니다.</p>
      )}
    </div>
  );
}
