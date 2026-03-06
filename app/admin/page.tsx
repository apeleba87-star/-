import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import G2bFetchButton from "./G2bFetchButton";

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabase();

  const [
    { count: postsCount },
    { count: queueCount },
    { count: ugcPending },
    { count: reportsCount },
  ] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("newsletter_queue").select("*", { count: "exact", head: true }).is("used_in_issue_id", null),
    supabase.from("ugc").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">관리자 대시보드</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="mt-6">
        <G2bFetchButton />
      </div>
    </div>
  );
}
