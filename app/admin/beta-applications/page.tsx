import { createServerSupabase } from "@/lib/supabase-server";
import { isBetaReviewStatus } from "@/lib/beta-admin-review";
import BetaApplicationsPanel, { type BetaApplicationAdminRow } from "./BetaApplicationsPanel";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

export default async function AdminBetaApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const statusFilter = params.status?.trim() || null;
  const statusValid = statusFilter && isBetaReviewStatus(statusFilter) ? statusFilter : null;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <p className="text-red-600">로그인이 필요합니다.</p>;
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return <p className="text-red-600">권한이 없습니다.</p>;
  }

  let q = supabase
    .from("beta_applications")
    .select(
      "id, created_at, updated_at, applicant_name, contact, phone, industry, employee_band, record_management, pain_experiences, dispute_last_year, desired_features, biggest_pain, availability, pain_score, review_status, review_tags, admin_note",
    )
    .order("pain_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (statusValid) {
    q = q.eq("review_status", statusValid);
  }

  const { data: rows, error } = await q;

  if (error) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">베타 지원 목록</h1>
        <p className="text-red-600">
          불러오지 못했습니다. Supabase 마이그레이션(특히 <code className="rounded bg-slate-100 px-1">135_beta_applications_review</code>) 적용 여부를
          확인해 주세요.
        </p>
        <p className="mt-2 font-mono text-sm text-slate-600">{error.message}</p>
      </div>
    );
  }

  const list = (rows ?? []) as BetaApplicationAdminRow[];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">베타 테스터 지원</h1>
      <p className="mb-6 text-sm text-slate-600">
        지원서 원시 데이터·검수 상태·태그·메모를 한곳에서 관리합니다. CSV는 최대 2000건까지 내려받습니다.
      </p>
      <BetaApplicationsPanel rows={list} statusFilter={statusValid} />
    </div>
  );
}
