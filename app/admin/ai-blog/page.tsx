import Link from "next/link";
import MonetizationSectionTabs from "@/components/admin/MonetizationSectionTabs";
import AiBlogAccessManager from "@/components/admin/AiBlogAccessManager";
import { loadAccessList, loadPlans, type AccessFilter } from "@/lib/ai-blog/admin-access";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const FILTERS: { id: AccessFilter; label: string; active: string }[] = [
  { id: "all", label: "전체", active: "bg-slate-800 text-white" },
  { id: "active", label: "사용 중", active: "bg-emerald-600 text-white" },
  { id: "expiring", label: "7일 내 만료", active: "bg-amber-600 text-white" },
  { id: "expired", label: "만료", active: "bg-slate-700 text-white" },
  { id: "suspended", label: "정지", active: "bg-red-600 text-white" },
];

type SearchParams = Promise<{ q?: string; filter?: string }>;

export default async function AdminAiBlogAccessPage({ searchParams }: { searchParams: SearchParams }) {
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) return <p className="text-red-600">로그인이 필요합니다.</p>;
  const { data: profile } = await authSupabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return <p className="text-red-600">권한이 없습니다.</p>;

  const params = await searchParams;
  const filter = FILTERS.some((f) => f.id === params.filter) ? (params.filter as AccessFilter) : "all";
  const q = params.q?.trim() ?? "";
  const [rows, plans] = await Promise.all([loadAccessList({ q, filter }), loadPlans()]);

  const href = (next: AccessFilter) => {
    const sp = new URLSearchParams();
    if (next !== "all") sp.set("filter", next);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return `/admin/ai-blog${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <MonetizationSectionTabs />
      <h1 className="mb-2 text-2xl font-bold text-slate-900">AI 블로그 권한</h1>
      <p className="mb-4 text-sm text-slate-600">
        입금 확인 후 회원에게 AI 블로그 사용 기간을 부여·연장합니다. 만료·정지된 회원은 기존 글 보기와 네이버로
        옮기기만 가능하고, 새 현장 등록과 AI 생성은 막힙니다. 회원 업체의 현장·사진·글 내용은 여기서 보이지 않습니다.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={href(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.id ? f.active : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </Link>
        ))}
        <div className="flex-1" />
        <form className="flex gap-2" action="/admin/ai-blog">
          {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="이메일 검색"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200">
            검색
          </button>
        </form>
      </div>

      <AiBlogAccessManager rows={rows} plans={plans} />
    </div>
  );
}
