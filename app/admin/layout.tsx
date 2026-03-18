import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";

function isInvalidSessionError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("Refresh Token") || msg.includes("refresh_token") || msg.includes("Invalid Refresh Token");
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && isInvalidSessionError(error)) {
      redirect("/login?next=/admin&reason=session_expired");
    }
    if (!user) {
      redirect("/login?next=/admin");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[admin layout] profile fetch error:", profileError.message);
      redirect("/login?next=/admin&reason=profile_error");
    }
    const isAdmin = profile?.role === "admin" || profile?.role === "editor";
    if (!isAdmin) {
      redirect("/?admin_required=1");
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
        <Link href="/admin/content-runs" className="font-medium text-slate-700 hover:text-slate-900">
          자동 생성 로그
        </Link>
        <Link href="/admin/report-snapshots" className="font-medium text-slate-700 hover:text-slate-900">
          리포트 스냅샷
        </Link>
        <Link href="/admin/ugc" className="font-medium text-slate-700 hover:text-slate-900">
          UGC 검수
        </Link>
        <Link href="/admin/reports" className="font-medium text-slate-700 hover:text-slate-900">
          신고
        </Link>
        <Link href="/admin/job-reports" className="font-medium text-slate-700 hover:text-slate-900">
          노쇼 신고
        </Link>
        <Link href="/admin/ads" className="font-medium text-slate-700 hover:text-slate-900">
          광고 슬롯
        </Link>
        <Link href="/admin/tender-keywords" className="font-medium text-slate-700 hover:text-slate-900">
          입찰 키워드
        </Link>
        <Link href="/admin/industries" className="font-medium text-slate-700 hover:text-slate-900">
          업종 관리
        </Link>
        <Link href="/admin/users" className="font-medium text-slate-700 hover:text-slate-900">
          사용자
        </Link>
        <Link href="/admin/listings/external" className="font-medium text-slate-700 hover:text-slate-900">
          현장거래 등록(외부)
        </Link>
        <Link href="/admin/listings/deal-completions" className="font-medium text-slate-700 hover:text-slate-900">
          거래 완료 신고 확인
        </Link>
        <Link href="/admin/jobs/external" className="font-medium text-slate-700 hover:text-slate-900">
          인력구인 등록(외부)
        </Link>
        <Link href="/admin/estimate-config" className="font-medium text-slate-700 hover:text-slate-900">
          견적 단가
        </Link>
        <Link href="/admin/categories" className="font-medium text-slate-700 hover:text-slate-900">
          카테고리
        </Link>
        <Link href="/" className="ml-auto text-slate-500 hover:text-slate-700">
          사이트로
        </Link>
      </nav>
      {children}
    </div>
    );
  } catch (e) {
    if (isInvalidSessionError(e)) {
      redirect("/login?next=/admin&reason=session_expired");
    }
    throw e;
  }
}
