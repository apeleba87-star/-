import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import JobPostCard from "@/components/jobs/JobPostCard";
import ManageView, {
  type ManageCalendarItem,
  type ManageCalendarDisplayStatus,
} from "@/components/jobs/ManageView";
import ManageApplicantsView, { type ManageApplicantRow } from "@/components/jobs/ManageApplicantsView";
import { getKstTodayString, getKstTomorrowString } from "@/lib/jobs/kst-date";
import { birthYearToAgeRangeLabel } from "@/lib/jobs/age-range";

export const revalidate = 60;

type JobPostRow = {
  id: string;
  title: string;
  status: string;
  region: string;
  district: string | null;
  work_date: string | null;
  created_at: string;
  user_id: string;
};

export default async function JobsManagePage() {
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) redirect("/login?next=/jobs/manage");

  const supabase = createClient();

  const { data: jobPosts } = await authSupabase
    .from("job_posts")
    .select("id, title, status, region, district, work_date, created_at, user_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!jobPosts?.length) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">내 구인 관리</h1>
        <p className="mt-0.5 text-sm text-slate-600">내가 쓴 구인글이 없습니다.</p>
        <div className="mt-6 rounded-2xl border border-white/30 bg-white/60 p-8 shadow-lg backdrop-blur-xl">
          <p className="text-center text-slate-500">구인글을 작성하면 지원자를 확인·관리할 수 있습니다.</p>
          <Link
            href="/jobs/new"
            className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-3 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
          >
            구인하기
          </Link>
          <Link href="/jobs" className="mt-3 block text-center text-sm font-medium text-slate-600 hover:text-slate-900">
            인력 구인 목록
          </Link>
        </div>
      </div>
    );
  }

  const postIds = jobPosts.map((p) => p.id);

  const { data: countRows } = await supabase.rpc("get_job_post_application_counts", {
    post_ids: postIds,
  });
  const applicationCountByPost = new Map(
    (countRows ?? []).map((r: { job_post_id: string; application_count: number }) => [
      r.job_post_id,
      Number(r.application_count) || 0,
    ])
  );

  const { data: positions } = await supabase
    .from("job_post_positions")
    .select("id, job_post_id, category_main_id, category_sub_id, custom_subcategory_text, job_type_input, normalized_job_type_key, skill_level, required_count, filled_count, pay_amount, pay_unit, normalized_daily_wage, status")
    .in("job_post_id", postIds)
    .order("sort_order", { ascending: true });

  const { data: categories } = await supabase.from("categories").select("id, name, parent_id");
  const categoryMap = new Map<string, string>();
  for (const c of categories ?? []) {
    categoryMap.set(c.id, c.name);
  }

  const positionsByPost = new Map<string, NonNullable<typeof positions>>();
  for (const p of positions ?? []) {
    const list = positionsByPost.get(p.job_post_id) ?? [];
    list.push(p);
    positionsByPost.set(p.job_post_id, list);
  }

  const positionIds = (positions ?? []).map((p) => p.id);
  const { data: noShowApps } =
    positionIds.length > 0
      ? await authSupabase
          .from("job_applications")
          .select("position_id")
          .eq("status", "no_show_reported")
          .in("position_id", positionIds)
      : { data: [] };
  const postIdsWithNoShow = new Set<string>();
  for (const row of noShowApps ?? []) {
    const pos = (positions ?? []).find((p) => p.id === row.position_id);
    if (pos) postIdsWithNoShow.add(pos.job_post_id);
  }

  const REPORT_PERIOD_DAYS = 30;
  const { data: allApplications } =
    positionIds.length > 0
      ? await authSupabase
          .from("job_applications")
          .select("id, position_id, user_id, status, created_at")
          .in("position_id", positionIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const applicantUserIds = [...new Set((allApplications ?? []).map((a) => a.user_id))];
  const { data: workerProfiles } =
    applicantUserIds.length > 0
      ? await supabase
          .from("worker_profiles")
          .select("user_id, nickname, birth_date, gender, bio")
          .in("user_id", applicantUserIds)
      : { data: [] };
  const profileByUser = new Map((workerProfiles ?? []).map((p) => [p.user_id, p]));

  const since = new Date();
  since.setDate(since.getDate() - REPORT_PERIOD_DAYS);
  const sinceIso = since.toISOString();
  const applicantIdsForNoShow =
    applicantUserIds.length > 0 ? applicantUserIds : ["00000000-0000-0000-0000-000000000000"];
  const { data: noShowReports } =
    applicantUserIds.length > 0
      ? await supabase
          .from("job_reports")
          .select("reported_user_id")
          .eq("reason_type", "no_show")
          .in("reported_user_id", applicantIdsForNoShow)
          .gte("created_at", sinceIso)
          .neq("status", "rescinded")
      : { data: [] };
  const noShowCountByUser = new Map<string, number>();
  for (const r of noShowReports ?? []) {
    noShowCountByUser.set(r.reported_user_id, (noShowCountByUser.get(r.reported_user_id) ?? 0) + 1);
  }

  const skillLevelLabel: Record<string, string> = { expert: "숙련자(기공)", general: "일반(보조)" };
  type PositionRow = NonNullable<typeof positions>[number];
  function positionDisplay(pos: PositionRow): { label: string; skillLabel: string } {
    const label =
      (pos.job_type_input && pos.job_type_input.trim()) ||
      (() => {
        const sub = pos.category_sub_id ? categoryMap.get(pos.category_sub_id) : null;
        const main = categoryMap.get(pos.category_main_id);
        if (sub) return sub;
        if (pos.custom_subcategory_text?.trim()) return pos.custom_subcategory_text.trim();
        return main ?? "—";
      })();
    const skillLabel = pos.skill_level ? skillLevelLabel[pos.skill_level] ?? "" : "";
    return { label, skillLabel };
  }

  const allApplicants: ManageApplicantRow[] = (allApplications ?? []).map((app) => {
    const pos = (positions ?? []).find((p) => p.id === app.position_id);
    const post = pos ? jobPosts?.find((p) => p.id === pos.job_post_id) : null;
    const profile = profileByUser.get(app.user_id);
    const { label, skillLabel } = pos ? positionDisplay(pos) : { label: "—", skillLabel: "" };
    const positionLabel = skillLabel ? `${label} / ${skillLabel}` : label;
    const birthYear = profile?.birth_date
      ? parseInt(String(profile.birth_date).slice(0, 4), 10)
      : null;
    const ageRangeLabel =
      birthYear != null && birthYear >= 1900 && birthYear <= 2100
        ? birthYearToAgeRangeLabel(birthYear)
        : "—";

    return {
      applicationId: app.id,
      jobPostId: pos?.job_post_id ?? "",
      jobTitle: post?.title ?? "—",
      workDate: post?.work_date ?? null,
      region: post?.region ?? "",
      district: post?.district ?? null,
      positionId: app.position_id,
      positionLabel,
      requiredCount: pos?.required_count ?? 0,
      filledCount: pos?.filled_count ?? 0,
      postStatus: post?.status ?? "open",
      userId: app.user_id,
      nickname: profile?.nickname ?? "",
      ageRangeLabel,
      gender: profile?.gender ?? null,
      bio: profile?.bio ?? null,
      status: app.status as ManageApplicantRow["status"],
      noShowCountInPeriod: noShowCountByUser.get(app.user_id) ?? 0,
      createdAt: app.created_at,
    };
  });

  const jobPostsForFilter = (jobPosts ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    work_date: p.work_date,
  }));

  const todayStr = getKstTodayString();
  const tomorrowStr = getKstTomorrowString();
  function getUrgentLabel(workDate: string | null): "today" | "tomorrow" | undefined {
    if (!workDate) return undefined;
    const d = workDate.slice(0, 10);
    if (d === todayStr) return "today";
    if (d === tomorrowStr) return "tomorrow";
    return undefined;
  }

  const sortedPosts = [...jobPosts].sort((a, b) => {
    const countA = Number(applicationCountByPost.get(a.id)) || 0;
    const countB = Number(applicationCountByPost.get(b.id)) || 0;
    if (countB !== countA) return countB - countA;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const calendarItems: ManageCalendarItem[] = sortedPosts.map((post) => {
    const posList = positionsByPost.get(post.id) ?? [];
    let displayStatus: ManageCalendarDisplayStatus = "recruiting";
    if (post.status === "closed") {
      displayStatus = "closed";
    } else if (posList.length > 0 && posList.every((p) => p.status === "closed")) {
      displayStatus = "recruitment_completed";
    }
    return {
      id: post.id,
      title: post.title,
      work_date: post.work_date,
      status: post.status,
      applicationCount: Number(applicationCountByPost.get(post.id)) || 0,
      region: post.region,
      district: post.district,
      displayStatus,
    };
  });

  const listSection = (
    <ul className="space-y-3">
      {sortedPosts.map((post, idx) => {
        const posList = positionsByPost.get(post.id) ?? [];
        const workDateFormatted = post.work_date
          ? new Date(post.work_date + "T12:00:00").toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : null;
        return (
          <JobPostCard
            key={post.id}
            index={idx}
            id={post.id}
            title={post.title}
            status={post.status}
            region={post.region}
            district={post.district ?? ""}
            work_date={workDateFormatted}
            applicationCount={Number(applicationCountByPost.get(post.id)) || 0}
            isOwner
            hasNoShowApplicant={postIdsWithNoShow.has(post.id)}
            urgentLabel={getUrgentLabel(post.work_date)}
            positions={posList.map((p) => {
              const { label, skillLabel } = positionDisplay(p);
              return {
                id: p.id,
                categoryDisplay: skillLabel ? `${label} / ${skillLabel}` : label,
                required_count: p.required_count,
                filled_count: p.filled_count,
                pay_amount: Number(p.pay_amount),
                pay_unit: p.pay_unit,
                status: (post.status === "closed" ? "closed" : p.status) as "open" | "partial" | "closed",
              };
            })}
          />
        );
      })}
    </ul>
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">내 구인 관리</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            내가 쓴 구인글과 지원자를 확인·관리합니다. 지원자가 있는 글이 위에 표시됩니다.
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
        >
          구인하기
        </Link>
      </div>

      <p className="mt-4">
        <Link href="/jobs" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← 인력 구인 목록
        </Link>
      </p>

      <ManageView
        calendarItems={calendarItems}
        listView={listSection}
        applicantsView={
          <ManageApplicantsView applicants={allApplicants} jobPostsForFilter={jobPostsForFilter} />
        }
      />
    </div>
  );
}
