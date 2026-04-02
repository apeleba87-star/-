import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { formatAuthProvidersForAdmin } from "@/lib/admin/auth-provider-labels";
import Link from "next/link";

const ROLE_LABEL: Record<string, string> = {
  subscriber: "구독자",
  editor: "에디터",
  admin: "관리자",
};

const PLAN_LABEL: Record<string, string> = {
  free: "무료",
  paid: "유료",
};

const PAGE_SIZE = 50;

function parsePage(raw: Record<string, string | string[] | undefined>): number {
  const p = typeof raw.page === "string" ? raw.page.trim() : "";
  if (!p) return 1;
  const n = parseInt(p, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** 현재 페이지 프로필 id들에 대해 Auth identities → 가입 방식 라벨 (service role 필요) */
async function loadProviderLabelsForUserIds(userIds: string[]): Promise<Record<string, string>> {
  const fallback = () => Object.fromEntries(userIds.map((id) => [id, "—"]));
  if (userIds.length === 0) return {};
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return fallback();
  try {
    const service = createServiceSupabase();
    const needed = new Set(userIds);
    const map: Record<string, string> = {};
    let page = 1;
    const perPage = 200;
    for (;;) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[admin/users] auth.admin.listUsers:", error.message);
        return fallback();
      }
      for (const u of data.users) {
        if (!needed.has(u.id)) continue;
        map[u.id] = formatAuthProvidersForAdmin(u.identities);
      }
      if (data.users.length < perPage) break;
      if (Object.keys(map).length >= needed.size) break;
      page += 1;
      if (page > 100) break;
    }
    for (const id of userIds) {
      if (!(id in map)) map[id] = "—";
    }
    return map;
  } catch {
    return fallback();
  }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params);
  const supabase = await createServerSupabase();

  const { count: totalCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const total = totalCount ?? 0;
  const pageCount = total === 0 ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, subscription_plan, phone, onboarding_done, created_at, updated_at")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">사용자 관리</h1>
        <p className="text-red-600">목록을 불러올 수 없습니다: {error.message}</p>
      </div>
    );
  }

  const list = profiles ?? [];
  const providerByUserId = await loadProviderLabelsForUserIds(list.map((p) => p.id));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">사용자 관리</h1>
      <p className="mb-6 text-sm text-slate-600">
        가입된 회원 목록입니다. 이메일·가입 방식·닉네임·역할·가입일 등을 확인할 수 있습니다. (총 {total}명)
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-semibold text-slate-700">가입일</th>
              <th className="px-4 py-3 font-semibold text-slate-700">이메일</th>
              <th className="px-4 py-3 font-semibold text-slate-700">가입 방식</th>
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
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  등록된 사용자가 없습니다.
                </td>
              </tr>
            ) : (
              list.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {p.created_at
                      ? new Date(p.created_at).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
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
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {providerByUserId[p.id] ?? "—"}
                    </span>
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

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {(total === 0 ? 0 : from + 1)}-{Math.min(to + 1, total)} / {total}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={safePage <= 1 ? "/admin/users" : `/admin/users?page=${safePage - 1}`}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              safePage <= 1
                ? "pointer-events-none border-slate-200 text-slate-300"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            이전
          </Link>
          <span className="text-sm text-slate-600">{safePage} / {pageCount}</span>
          <Link
            href={safePage >= pageCount ? `/admin/users?page=${pageCount}` : `/admin/users?page=${safePage + 1}`}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              safePage >= pageCount
                ? "pointer-events-none border-slate-200 text-slate-300"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            다음
          </Link>
        </div>
      </div>
    </div>
  );
}
