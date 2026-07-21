import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { ADMIN_HUBS } from "@/lib/admin/nav-config";

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabase();

  const [
    { count: postsCount },
    { count: queueCount },
    { count: ugcPending },
    { count: reportsCount },
    { count: usersCount },
    betaRes,
  ] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("newsletter_queue").select("*", { count: "exact", head: true }).is("used_in_issue_id", null),
    supabase.from("ugc").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("beta_applications").select("*", { count: "exact", head: true }).eq("review_status", "new"),
  ]);

  const betaNew = betaRes.error ? 0 : (betaRes.count ?? 0);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">관리자 대시보드</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">콘텐츠 편집</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/blog"
            className="block rounded-2xl border-2 border-violet-800 bg-violet-50 px-5 py-4 transition hover:bg-violet-100"
          >
            <h3 className="font-black text-violet-950">청소지식</h3>
            <p className="mt-1 text-sm text-violet-900/80">직접 작성 · 다음 글·제품 연결 · /blog</p>
          </Link>
          <Link
            href="/admin/solutions"
            className="block rounded-2xl border-2 border-teal-800 bg-teal-50 px-5 py-4 transition hover:bg-teal-100"
          >
            <h3 className="font-black text-teal-950">검색어 솔루션</h3>
            <p className="mt-1 text-sm text-teal-900/80">목록 → 편집하기 / 새로 만들기</p>
          </Link>
          <Link
            href="/admin/places"
            className="block rounded-2xl border-2 border-slate-800 bg-slate-50 px-5 py-4 transition hover:bg-slate-100"
          >
            <h3 className="font-black text-slate-950">장소별 청소 방법</h3>
            <p className="mt-1 text-sm text-slate-700/80">장소 → 할 일 · 루틴·동선 매뉴얼</p>
          </Link>
          <Link
            href="/admin/materials"
            className="block rounded-2xl border-2 border-amber-800 bg-amber-50 px-5 py-4 transition hover:bg-amber-100"
          >
            <h3 className="font-black text-amber-950">재질별 표면 안전</h3>
            <p className="mt-1 text-sm text-amber-900/80">금기 · 권장 · 일상 관리</p>
          </Link>
          <Link
            href="/admin/knowledge-hub"
            className="block rounded-2xl border border-slate-200 bg-white px-5 py-4 transition hover:border-teal-300"
          >
            <h3 className="font-bold text-slate-900">지식 허브 (마스터)</h3>
            <p className="mt-1 text-sm text-slate-500">제품 판매 링크 · 가이드 편집 링크</p>
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Link href="/admin/users" className="card block hover:border-blue-200">
          <h3 className="text-sm font-medium text-slate-500">총 사용자</h3>
          <p className="mt-1 text-2xl font-bold text-slate-800">{usersCount ?? 0}명</p>
        </Link>
        <Link href="/admin/beta-applications?status=new" className="card block hover:border-teal-200">
          <h3 className="text-sm font-medium text-slate-500">베타 지원 (신규)</h3>
          <p className="mt-1 text-2xl font-bold text-teal-800">{betaNew ?? 0}건</p>
        </Link>
        <Link href="/admin/posts" className="card block hover:border-blue-200">
          <h3 className="text-sm font-medium text-slate-500">글</h3>
          <p className="mt-1 text-2xl font-bold text-slate-800">{postsCount ?? 0}개</p>
        </Link>
        <Link href="/admin/newsletter" className="card block hover:border-blue-200">
          <h3 className="text-sm font-medium text-slate-500">큐 (미사용)</h3>
          <p className="mt-1 text-2xl font-bold text-slate-800">{queueCount ?? 0}개</p>
        </Link>
        <Link href="/admin/ugc" className="card block hover:border-blue-200">
          <h3 className="text-sm font-medium text-slate-500">UGC 검수 대기</h3>
          <p className="mt-1 text-2xl font-bold text-slate-800">{ugcPending ?? 0}건</p>
        </Link>
        <Link href="/admin/reports" className="card block hover:border-blue-200">
          <h3 className="text-sm font-medium text-slate-500">신고 대기</h3>
          <p className="mt-1 text-2xl font-bold text-slate-800">{reportsCount ?? 0}건</p>
        </Link>
      </div>
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">업무 메뉴</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_HUBS.map((hub) => (
            <Link
              key={hub.id}
              href={hub.href}
              className="card block hover:border-slate-300 hover:shadow-sm"
            >
              <h3 className="font-medium text-slate-900">{hub.label}</h3>
              <p className="mt-1 text-sm text-slate-500">{hub.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
