import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import MatchesView from "@/components/jobs/MatchesView";
import { glassCard } from "@/lib/ui-styles";

export const revalidate = 60;

export type MatchItem = {
  applicationId: string;
  jobPostId: string;
  title: string;
  positionLabel: string;
  workDate: string | null;
  startTime: string | null;
  endTime: string | null;
  region: string;
  district: string;
  address: string | null;
};

export default async function JobsMatchesPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/jobs/matches")}`);

  const { data: applications } = await supabase
    .from("job_applications")
    .select("id, position_id")
    .eq("user_id", user.id)
    .eq("status", "accepted");

  if (!applications?.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/jobs" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <span aria-hidden>←</span> 인력 구인
        </Link>
        <div className={`${glassCard} p-8 text-center`}>
          <h1 className="text-xl font-bold text-slate-900">내 매칭</h1>
          <p className="mt-3 text-slate-600">아직 확정된 매칭이 없습니다.</p>
          <p className="mt-1 text-sm text-slate-500">지원한 구인글에서 확정되면 여기에 표시됩니다.</p>
          <Link href="/jobs" className="mt-6 inline-block text-blue-600 hover:underline">구인글 보기</Link>
        </div>
      </div>
    );
  }

  const positionIds = applications.map((a) => a.position_id);
  const { data: positions } = await supabase
    .from("job_post_positions")
    .select("id, job_post_id, job_type_input, custom_subcategory_text, category_main_id, category_sub_id")
    .in("id", positionIds);

  const postIds = [...new Set((positions ?? []).map((p) => p.job_post_id))];
  const { data: posts } = await supabase
    .from("job_posts")
    .select("id, title, work_date, start_time, end_time, region, district, address")
    .in("id", postIds);

  const { data: categories } = await supabase.from("categories").select("id, name");
  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const postById = new Map((posts ?? []).map((p) => [p.id, p]));
  const positionById = new Map((positions ?? []).map((p) => [p.id, p]));

  const matches: MatchItem[] = applications.map((app) => {
    const pos = positionById.get(app.position_id);
    const post = pos ? postById.get(pos.job_post_id) : null;
    if (!pos || !post) {
      return null;
    }
    const subName = pos.category_sub_id ? categoryMap.get(pos.category_sub_id) : null;
    const mainName = categoryMap.get(pos.category_main_id);
    const positionLabel =
      (pos.job_type_input && pos.job_type_input.trim()) ||
      pos.custom_subcategory_text?.trim() ||
      subName ||
      mainName ||
      "—";
    return {
      applicationId: app.id,
      jobPostId: post.id,
      title: post.title,
      positionLabel,
      workDate: post.work_date,
      startTime: post.start_time,
      endTime: post.end_time,
      region: post.region,
      district: post.district ?? "",
      address: post.address,
    };
  }).filter((m): m is MatchItem => m != null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/jobs" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
        <span aria-hidden>←</span> 인력 구인
      </Link>
      <h1 className="text-xl font-bold text-slate-900">내 매칭</h1>
      <p className="mt-0.5 text-sm text-slate-600">확정된 현장 일정을 목록과 달력으로 확인하세요.</p>
      <MatchesView matches={matches} />
    </div>
  );
}
