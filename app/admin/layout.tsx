import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin" || profile?.role === "editor";
  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-8 flex flex-wrap gap-4 border-b border-slate-200 pb-4">
        <Link href="/admin" className="font-medium text-slate-700 hover:text-slate-900">
          대시보드
        </Link>
        <Link href="/admin/posts" className="font-medium text-slate-700 hover:text-slate-900">
          글 관리
        </Link>
        <Link href="/admin/newsletter" className="font-medium text-slate-700 hover:text-slate-900">
          뉴스레터 큐·발송
        </Link>
        <Link href="/admin/ugc" className="font-medium text-slate-700 hover:text-slate-900">
          UGC 검수
        </Link>
        <Link href="/admin/reports" className="font-medium text-slate-700 hover:text-slate-900">
          신고
        </Link>
        <Link href="/admin/ads" className="font-medium text-slate-700 hover:text-slate-900">
          광고 슬롯
        </Link>
        <Link href="/admin/tender-keywords" className="font-medium text-slate-700 hover:text-slate-900">
          입찰 키워드
        </Link>
        <Link href="/" className="ml-auto text-slate-500 hover:text-slate-700">
          사이트로
        </Link>
      </nav>
      {children}
    </div>
  );
}
