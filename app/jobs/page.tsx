import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import JobPostCard from "@/components/jobs/JobPostCard";
import JobsListToolbar from "@/components/jobs/JobsListToolbar";
import AuthRequiredCta from "@/components/AuthRequiredCta";
import {
  SORT_OPTIONS,
  type SortOption,
  type JobsListSearchParams,
} from "@/lib/jobs/job-list-options";
import { getKstTodayString, getKstTomorrowString, addDaysToDateString } from "@/lib/jobs/kst-date";
import { getActiveJobsAds } from "@/lib/ads";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";

export const revalidate = 60;

type Filter = "all" | "posted" | "applied";

const SORT_VALUES: SortOption[] = ["latest", "work_date", "pay_high", "closing"];
function parseSort(v: unknown): SortOption {
  if (typeof v === "string" && SORT_VALUES.includes(v as SortOption))
    return v as SortOption;
  return "latest";
}

function buildJobsQuery(overrides: Partial<JobsListSearchParams>): string {
  const q = new URLSearchParams();
  const set = (k: keyof JobsListSearchParams, v: string | undefined) => {
    if (v != null && v !== "") q.set(k, v);
  };
  set("mine", overrides.mine);
  set("sort", overrides.sort);
  set("region", overrides.region);
  set("district", overrides.district);
  set("job_type", overrides.job_type);
  set("skill_level", overrides.skill_level);
  set("work_date_from", overrides.work_date_from);
  set("work_date_to", overrides.work_date_to);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export default async function JobsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = createClient();
  const params = await searchParams;
  const mine = params.mine as Filter | undefined;
  const filter: Filter =
    mine === "posted" || mine === "applied" ? mine : "all";
  const sort = parseSort(params.sort);
  const filterRegion =
    typeof params.region === "string" && params.region.trim()
      ? params.region.trim()
      : undefined;
  const filterDistrict =
    typeof params.district === "string" && params.district.trim()
      ? params.district.trim()
      : undefined;
  const filterJobType =
    typeof params.job_type === "string" && params.job_type.trim()
      ? params.job_type.trim()
      : undefined;
  const filterSkillLevel =
    typeof params.skill_level === "string" && params.skill_level.trim()
      ? params.skill_level.trim()
      : undefined;
  const workDateFrom =
    typeof params.work_date_from === "string" && params.work_date_from.trim()
      ? params.work_date_from.trim()
      : undefined;
  const workDateTo =
    typeof params.work_date_to === "string" && params.work_date_to.trim()
      ? params.work_date_to.trim()
      : undefined;
  const currentQuery: JobsListSearchParams = {
    mine: filter !== "all" ? filter : undefined,
    sort,
    region: filterRegion,
    district: filterDistrict,
    job_type: filterJobType,
    skill_level: filterSkillLevel,
    work_date_from: workDateFrom,
    work_date_to: workDateTo,
  };

  const authSupabase = await createServerSupabase();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (mine === "posted") redirect("/jobs/manage");

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
  let jobPosts: JobPostRow[] | null = null;
  let postIds: string[] = [];

  if (filter === "applied" && !user) {
    jobPosts = [];
    postIds = [];
  } else if (filter === "applied" && user) {
    const { data: myApps } = await authSupabase
      .from("job_applications")
      .select("position_id, status")
      .eq("user_id", user.id)
      .neq("status", "accepted");
    const positionIds = (myApps ?? []).map((a) => a.position_id).filter(Boolean);
    if (positionIds.length === 0) {
      jobPosts = [];
    } else {
      const { data: posRows } = await supabase
        .from("job_post_positions")
        .select("job_post_id")
        .in("id", positionIds);
      const ids = [...new Set((posRows ?? []).map((p) => p.job_post_id))];
      if (ids.length === 0) {
        jobPosts = [];
      } else {
        const { data } = await supabase
          .from("job_posts")
          .select("id, title, status, region, district, work_date, created_at, user_id")
          .in("id", ids)
          .order("created_at", { ascending: false });
        jobPosts = data ?? [];
        postIds = jobPosts.map((p) => p.id);
      }
    }
  } else {
    const MAX_LIST_LIMIT = 50;
    const { data } = await supabase
      .from("job_posts")
      .select("id, title, status, region, district, work_date, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(MAX_LIST_LIMIT);
    jobPosts = data ?? [];
    postIds = jobPosts.map((p) => p.id);
  }

  jobPosts = jobPosts ?? [];

  if (filter === "all" && user && jobPosts.length > 0) {
    const { data: myApps } = await authSupabase
      .from("job_applications")
      .select("position_id")
      .eq("user_id", user.id);
    const appliedPositionIds = (myApps ?? []).map((a) => a.position_id).filter(Boolean);
    if (appliedPositionIds.length > 0) {
      const { data: posRows } = await supabase
        .from("job_post_positions")
        .select("job_post_id")
        .in("id", appliedPositionIds);
      const myAppliedPostIds = new Set((posRows ?? []).map((p) => p.job_post_id));
      jobPosts = jobPosts.filter((p) => !myAppliedPostIds.has(p.id));
      postIds = jobPosts.map((p) => p.id);
    }
  }

  if (filter === "applied" && jobPosts.length > 0) {
    const todayKstForFilter = getKstTodayString();
    jobPosts = jobPosts.filter((p) => {
      if (!p.work_date) return true;
      const dayAfterWork = addDaysToDateString(p.work_date, 1);
      return dayAfterWork >= todayKstForFilter;
    });
    postIds = jobPosts.map((p) => p.id);
  }

  const { data: dayPositions } =
    postIds.length > 0
      ? await supabase
          .from("job_post_positions")
          .select("pay_amount, pay_unit, normalized_daily_wage")
          .in("job_post_id", postIds)
          .eq("pay_unit", "day")
      : { data: [] };

  const dayWages =
    dayPositions?.map((p) =>
      p.normalized_daily_wage != null ? Number(p.normalized_daily_wage) : Number(p.pay_amount)
    ) ?? [];
  const avgDailyWage =
    dayWages.length > 0
      ? Math.round(dayWages.reduce((a, b) => a + b, 0) / dayWages.length)
      : null;

  const hasPosts = (jobPosts?.length ?? 0) > 0;
  const jobsAds = await getActiveJobsAds();

  if (!hasPosts) {
    const isAppliedGuest = filter === "applied" && !user;
    const emptyMessage =
      isAppliedGuest
        ? "로그인하면 지원한 현장을 볼 수 있습니다."
        : filter === "applied"
          ? "지원한 구인글이 없습니다."
          : "등록된 구인글이 없습니다.";
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">인력 구인</h1>
        <p className="mt-0.5 text-sm text-slate-600">{emptyMessage}</p>
        <div className="mt-6 rounded-2xl border border-white/30 bg-white/60 p-8 shadow-lg backdrop-blur-xl">
          {filter === "all" ? (
            <>
              <p className="text-center text-slate-500">구인글 작성은 내 구인 관리에서 할 수 있습니다.</p>
              <Link href="/jobs/manage" className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-3 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-blue-700">
                내 구인 관리로 이동
              </Link>
            </>
          ) : isAppliedGuest ? (
            <>
              <p className="text-center text-slate-500">
                지원한 구인글은 로그인 후 확인할 수 있습니다.
              </p>
              <Link href={`/login?next=${encodeURIComponent("/jobs?mine=applied")}`} className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-3 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-blue-700">
                로그인하기
              </Link>
            </>
          ) : (
            <>
              <p className="text-center text-slate-500">
                지원한 구인글이 여기에 모입니다.
              </p>
              <Link href="/jobs" className="mt-4 inline-block w-full text-center text-sm font-medium text-blue-600 hover:underline">
                전체 목록 보기
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const ownerIds = [...new Set((jobPosts ?? []).map((p) => p.user_id).filter(Boolean))] as string[];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ownerIds.length ? ownerIds : ["00000000-0000-0000-0000-000000000000"]);
  const nicknameByOwner = new Map(
    (profiles ?? []).map((p) => [p.id, (p.display_name ?? "").trim()])
  );

  const { data: positions } = await supabase
    .from("job_post_positions")
    .select("id, job_post_id, category_main_id, category_sub_id, custom_subcategory_text, job_type_input, normalized_job_type_key, skill_level, required_count, filled_count, pay_amount, pay_unit, normalized_daily_wage, status")
    .in("job_post_id", postIds)
    .order("sort_order", { ascending: true });

  const { data: categories } = await supabase.from("categories").select("id, name, parent_id").in("usage", ["job", "default"]);

  const categoryMap = new Map<string, string>();
  for (const c of categories ?? []) {
    categoryMap.set(c.id, c.name);
  }

  const positionsByPost = new Map<string, typeof positions>();
  for (const p of positions ?? []) {
    const list = positionsByPost.get(p.job_post_id) ?? [];
    list.push(p);
    positionsByPost.set(p.job_post_id, list);
  }

  // 필터: 지역, 작업종류, 숙련도, 일당 이상, 작업일
  let filteredPosts = jobPosts;
  // 전체 목록: 작업일이 지난 글(마감)은 제외. 내가 쓴 글/지원한 글은 전부 노출
  const todayKst = getKstTodayString();
  if (filter === "all") {
    filteredPosts = filteredPosts.filter(
      (p) =>
        p.status !== "closed" &&
        (p.work_date == null || p.work_date >= todayKst)
    );
  }
  if (filterRegion != null)
    filteredPosts = filteredPosts.filter((p) => p.region === filterRegion);
  if (filterDistrict != null)
    filteredPosts = filteredPosts.filter((p) => p.district === filterDistrict);
  if (workDateFrom != null)
    filteredPosts = filteredPosts.filter(
      (p) => p.work_date != null && p.work_date >= workDateFrom
    );
  if (workDateTo != null)
    filteredPosts = filteredPosts.filter(
      (p) => p.work_date != null && p.work_date <= workDateTo
    );
  if (filterJobType != null || filterSkillLevel != null) {
    filteredPosts = filteredPosts.filter((post) => {
      const posList = positionsByPost.get(post.id) ?? [];
      return posList.some((pos) => {
        if (filterJobType != null && pos.normalized_job_type_key !== filterJobType)
          return false;
        if (filterSkillLevel != null && pos.skill_level !== filterSkillLevel)
          return false;
        return true;
      });
    });
  }

  // 정렬용: 글별 최대 일당 (일당 포지션만)
  const maxDailyWageByPost = new Map<string, number>();
  for (const post of filteredPosts) {
    const posList = positionsByPost.get(post.id) ?? [];
    let maxW = 0;
    for (const pos of posList) {
      if (pos.pay_unit !== "day") continue;
      const w =
        pos.normalized_daily_wage != null
          ? Number(pos.normalized_daily_wage)
          : Number(pos.pay_amount);
      if (w > maxW) maxW = w;
    }
    maxDailyWageByPost.set(post.id, maxW);
  }

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sort === "latest")
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    if (sort === "work_date") {
      if (!a.work_date) return 1;
      if (!b.work_date) return -1;
      return a.work_date.localeCompare(b.work_date);
    }
    if (sort === "pay_high") {
      const wa = maxDailyWageByPost.get(a.id) ?? 0;
      const wb = maxDailyWageByPost.get(b.id) ?? 0;
      return wb - wa;
    }
    if (sort === "closing") {
      if (!a.work_date) return 1;
      if (!b.work_date) return -1;
      return a.work_date.localeCompare(b.work_date);
    }
    return 0;
  });

  // 급구 뱃지: 작업일 기준 오늘/내일 (KST). 11일엔 작업일 12일 → 내일 현장, 12일엔 오늘 현장
  const todayStr = getKstTodayString();
  const tomorrowStr = getKstTomorrowString();
  function getUrgentLabel(workDate: string | null): "today" | "tomorrow" | undefined {
    if (!workDate) return undefined;
    const d = workDate.slice(0, 10);
    if (d === todayStr) return "today";
    if (d === tomorrowStr) return "tomorrow";
    return undefined;
  }

  const hasFilteredPosts = sortedPosts.length > 0;

  const { data: countRows } = await supabase.rpc(
    "get_job_post_application_counts",
    { post_ids: postIds }
  );
  const applicationCountByPost = new Map(
    (countRows ?? []).map((r: { job_post_id: string; application_count: number }) => [
      r.job_post_id,
      Number(r.application_count) || 0,
    ])
  );

  let myStatusByPostId = new Map<string, string>();
  if (user && (jobPosts?.length ?? 0) > 0) {
    const positionIdsForMyPosts = (positions ?? [])
      .filter((p) => postIds.includes(p.job_post_id))
      .map((p) => p.id);
    if (positionIdsForMyPosts.length > 0) {
      const { data: myAppDetails } = await authSupabase
        .from("job_applications")
        .select("position_id, status")
        .eq("user_id", user.id)
        .in("position_id", positionIdsForMyPosts);
      const statusByPositionId = new Map((myAppDetails ?? []).map((a: { position_id: string; status: string }) => [a.position_id, a.status]));
      const statusLabels: Record<string, string> = {
        applied: "지원함",
        reviewing: "검토 중",
        accepted: "확정됨",
        rejected: "거절됨",
        cancelled: "취소함",
        no_show_reported: "노쇼 발생",
      };
      // 내가 지원한 현장 목록에서는 노쇼 발생을 노출하지 않고 마감으로만 표시
      const statusLabelsForApplicant: Record<string, string> = {
        ...statusLabels,
        no_show_reported: "마감",
      };
      const labels = filter === "applied" ? statusLabelsForApplicant : statusLabels;
      for (const post of jobPosts ?? []) {
        const posList = positionsByPost.get(post.id) ?? [];
        for (const pos of posList) {
          const st = statusByPositionId.get(pos.id);
          if (st) {
            myStatusByPostId.set(post.id, labels[st] ?? st);
            break;
          }
        }
      }
    }
  }

  const skillLevelLabel: Record<string, string> = { expert: "숙련자(기공)", general: "일반(보조)" };
  type PositionRow = NonNullable<typeof positions>[number];
  function positionDisplay(pos: PositionRow): { label: string; skillLabel: string } {
    const label = (pos.job_type_input && pos.job_type_input.trim()) || (() => {
      const sub = pos.category_sub_id ? categoryMap.get(pos.category_sub_id) : null;
      const main = categoryMap.get(pos.category_main_id);
      if (sub) return sub;
      if (pos.custom_subcategory_text?.trim()) return pos.custom_subcategory_text.trim();
      return main ?? "—";
    })();
    const skillLabel = pos.skill_level ? skillLevelLabel[pos.skill_level] ?? "" : "";
    return { label, skillLabel };
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">인력 구인</h1>
            {avgDailyWage != null && dayWages.length > 0 ? (
              <p className="mt-0.5 text-sm text-slate-600">
                일당 평균 <span className="font-semibold text-slate-800">{avgDailyWage.toLocaleString()}원</span>
                <span className="text-slate-500"> (최근 {dayWages.length}건)</span>
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-500">구인글을 확인하고 지원하세요.</p>
            )}
          </div>
        </div>
        <AuthRequiredCta
          isLoggedIn={!!user}
          href="/jobs/new"
          message="로그인 후에만 구인이 가능합니다."
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          구인하기
        </AuthRequiredCta>
      </div>

      {(jobsAds.jobs_top?.enabled && (jobsAds.jobs_top.campaign || jobsAds.jobs_top.script_content)) ? (
        <div className="mb-6">
          <AdSlotRenderer slot={jobsAds.jobs_top} variant="card" />
        </div>
      ) : null}

      {user && (
        <nav
          className="mt-4 flex gap-1 rounded-xl bg-slate-100/80 p-1"
          aria-label="목록 필터"
        >
          <Link
            href={`/jobs${buildJobsQuery({ ...currentQuery, mine: undefined })}`}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            전체
          </Link>
          <Link
            href="/jobs/manage"
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            내 구인 관리
          </Link>
          <Link
            href={`/jobs${buildJobsQuery({ ...currentQuery, mine: "applied" })}`}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              filter === "applied"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            내가 지원한 현장
          </Link>
          <Link
            href="/jobs/matches"
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            내 매칭
          </Link>
        </nav>
      )}

      <Suspense fallback={<div className="mt-4 h-20 animate-pulse rounded-xl bg-slate-100" />}>
        <JobsListToolbar
          currentSort={sort}
          currentFilters={{
            region: filterRegion,
            district: filterDistrict,
            job_type: filterJobType,
          skill_level: filterSkillLevel,
          work_date_from: workDateFrom,
            work_date_to: workDateTo,
          }}
        />
      </Suspense>

      {!hasFilteredPosts && hasPosts ? (
        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-8 text-center">
          <p className="text-slate-500">조건에 맞는 구인글이 없습니다.</p>
          <p className="mt-1 text-sm text-slate-400">
            필터를 바꿔 보시거나 필터를 초기화해 보세요.
          </p>
        </div>
      ) : (
      <ul className="mt-6 space-y-3">
        {sortedPosts.map((post, idx) => {
          const posList = positionsByPost.get(post.id) ?? [];
          const workDateFormatted = post.work_date
            ? new Date(post.work_date + "T12:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric", year: "numeric" })
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
              ownerNickname={nicknameByOwner.get(post.user_id) || undefined}
              applicationCount={Number(applicationCountByPost.get(post.id)) || 0}
              myStatusLabel={myStatusByPostId.get(post.id)}
              isOwner={user?.id === post.user_id}
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
                  status: p.status as "open" | "partial" | "closed",
                };
              })}
            />
          );
        })}
      </ul>
      )}
    </div>
  );
}
