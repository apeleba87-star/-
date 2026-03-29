import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import JobsPrimaryTabs from "@/components/jobs/JobsPrimaryTabs";
import JobsSecondaryTabs from "@/components/jobs/JobsSecondaryTabs";
import ManageView, { type ManageCalendarItem, type ManageCalendarDisplayStatus } from "@/components/jobs/ManageView";
import ManageApplicantsView from "@/components/jobs/ManageApplicantsView";
import ManageJobPostCards, { type ManageJobPostRow } from "@/components/jobs/ManageJobPostCards";
import ManageListPagination from "@/components/jobs/ManageListPagination";
import { parseManageApplicantsParams, MANAGE_APPLICANTS_PAGE_SIZE } from "@/lib/jobs/manage-applicants-params";
import { loadManageApplicantsData } from "@/lib/jobs/manage-applicants-data";
import { buildActiveJobPostsOrFilter, MANAGE_LIST_PAGE_SIZE } from "@/lib/jobs/manage-list-scope";

export const revalidate = 60;
export const dynamic = "force-dynamic";

const CALENDAR_ACTIVE_LIMIT = 500;
const APPLICANTS_META_LIMIT = 400;

type PositionRow = {
  id: string;
  job_post_id: string;
  category_main_id: string;
  category_sub_id: string | null;
  custom_subcategory_text: string | null;
  job_type_input: string | null;
  normalized_job_type_key: string | null;
  skill_level: string | null;
  required_count: number;
  filled_count: number;
  pay_amount: number | string;
  pay_unit: string;
  normalized_daily_wage: number | string | null;
  status: string;
};

function parseListPage(raw: Record<string, string | string[] | undefined>): number {
  const p = typeof raw.page === "string" ? raw.page.trim() : "";
  if (!p) return 1;
  const n = parseInt(p, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function JobsManagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawView = typeof params.view === "string" ? params.view : "list";
  const viewMode: "list" | "calendar" | "applicants" =
    rawView === "calendar" || rawView === "applicants" ? rawView : "list";

  const listScope = typeof params.scope === "string" && params.scope === "all" ? "all" : "active";
  const listPage = parseListPage(params);
  const applicantsParams = parseManageApplicantsParams(params);

  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) redirect("/login?next=/jobs/manage");

  const supabase = createClient();

  const { count: userPostCount } = await authSupabase
    .from("job_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!userPostCount) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-xl font-bold text-slate-900">내 구인 관리</h1>
        <p className="mt-0.5 text-sm text-slate-600">내가 쓴 구인글이 없습니다.</p>
        <JobsPrimaryTabs
          active="posted"
          allHref="/jobs"
          postedHref="/jobs/manage"
          appliedHref="/jobs?mine=applied"
          matchesHref="/jobs/matches"
        />
        <JobsSecondaryTabs
          activeKey={viewMode}
          items={[
            { key: "list", label: "목록", href: "/jobs/manage" },
            { key: "calendar", label: "달력", href: "/jobs/manage?view=calendar" },
            { key: "applicants", label: "전체 지원자", href: "/jobs/manage?view=applicants" },
          ]}
        />
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

  const { data: categories } = await supabase.from("categories").select("id, name, parent_id").in("usage", ["job", "default"]);
  const categoryMap = new Map<string, string>();
  for (const c of categories ?? []) {
    categoryMap.set(c.id, c.name);
  }

  let listPagePosts: ManageJobPostRow[] = [];
  let listTotalCount = 0;
  /** 목록 탭 페이지네이션 표시용(범위 초과 page 요청 시 클램프) */
  let listPageForPagination = 1;
  let calendarPosts: ManageJobPostRow[] = [];
  let applicantsPostsMeta: ManageJobPostRow[] = [];

  if (viewMode === "list") {
    let countQ = authSupabase.from("job_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if (listScope === "active") {
      countQ = countQ.or(buildActiveJobPostsOrFilter());
    }
    const { count: c } = await countQ;
    listTotalCount = c ?? 0;
    const listPageCount = listTotalCount === 0 ? 1 : Math.max(1, Math.ceil(listTotalCount / MANAGE_LIST_PAGE_SIZE));
    const effListPage = Math.min(listPage, listPageCount);
    listPageForPagination = effListPage;

    const from = (effListPage - 1) * MANAGE_LIST_PAGE_SIZE;
    const to = from + MANAGE_LIST_PAGE_SIZE - 1;
    let dataQ = authSupabase
      .from("job_posts")
      .select("id, title, status, region, district, work_date, created_at, user_id, view_count")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (listScope === "active") {
      dataQ = dataQ.or(buildActiveJobPostsOrFilter());
    }
    const { data } = await dataQ;
    listPagePosts = (data ?? []) as ManageJobPostRow[];
  }

  if (viewMode === "calendar") {
    const { data } = await authSupabase
      .from("job_posts")
      .select("id, title, status, region, district, work_date, created_at, user_id, view_count")
      .eq("user_id", user.id)
      .or(buildActiveJobPostsOrFilter())
      .order("created_at", { ascending: false })
      .limit(CALENDAR_ACTIVE_LIMIT);
    calendarPosts = (data ?? []) as ManageJobPostRow[];
  }

  let ownerApplicationTotals: { totalAll: number; pendingTotal: number } | undefined;

  if (viewMode === "applicants") {
    let metaQ = authSupabase
      .from("job_posts")
      .select("id, title, status, region, district, work_date, created_at, user_id, view_count")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (applicantsParams.period === "upcoming") {
      metaQ = metaQ.or(buildActiveJobPostsOrFilter());
    }
    const [postsRes, totalsRes] = await Promise.all([
      metaQ.limit(APPLICANTS_META_LIMIT),
      authSupabase.rpc("get_job_owner_application_totals", { p_owner_user_id: user.id }),
    ]);
    applicantsPostsMeta = (postsRes.data ?? []) as ManageJobPostRow[];
    if (!totalsRes.error) {
      const tr = totalsRes.data?.[0] as { total_count: number; pending_count: number } | undefined;
      ownerApplicationTotals =
        tr != null
          ? {
              totalAll: Number(tr.total_count) || 0,
              pendingTotal: Number(tr.pending_count) || 0,
            }
          : { totalAll: 0, pendingTotal: 0 };
    }
  }

  const postIdsForData = (() => {
    if (viewMode === "list") return listPagePosts.map((p) => p.id);
    if (viewMode === "calendar") return calendarPosts.map((p) => p.id);
    return applicantsPostsMeta.map((p) => p.id);
  })();

  const { data: positions } =
    postIdsForData.length > 0
      ? await supabase
          .from("job_post_positions")
          .select(
            "id, job_post_id, category_main_id, category_sub_id, custom_subcategory_text, job_type_input, normalized_job_type_key, skill_level, required_count, filled_count, pay_amount, pay_unit, normalized_daily_wage, status"
          )
          .in("job_post_id", postIdsForData)
          .order("sort_order", { ascending: true })
      : { data: [] as PositionRow[] };

  const positionRows = (positions ?? []) as PositionRow[];
  const positionsByPost = new Map<string, PositionRow[]>();
  for (const p of positionRows) {
    const list = positionsByPost.get(p.job_post_id) ?? [];
    list.push(p);
    positionsByPost.set(p.job_post_id, list);
  }

  const positionIds = positionRows.map((p) => p.id);

  const applicationCountByPost = new Map<string, number>();
  let postIdsWithNoShow = new Set<string>();
  let shareStatsByPost = new Map<string, { open: number; apply: number }>();

  if (postIdsForData.length > 0) {
    const { data: countRows } = await supabase.rpc("get_job_post_application_counts", {
      post_ids: postIdsForData,
    });
    for (const r of countRows ?? []) {
      const row = r as { job_post_id: string; application_count: number };
      applicationCountByPost.set(row.job_post_id, Number(row.application_count) || 0);
    }

    if (viewMode === "list" && positionIds.length > 0) {
      const { data: noShowApps } = await authSupabase
        .from("job_applications")
        .select("position_id")
        .eq("status", "no_show_reported")
        .in("position_id", positionIds);
      for (const row of noShowApps ?? []) {
        const pos = positionRows.find((p) => p.id === (row as { position_id: string }).position_id);
        if (pos) postIdsWithNoShow.add(pos.job_post_id);
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: shareEvents } = await authSupabase
        .from("job_share_events")
        .select("job_post_id, event_type")
        .eq("owner_user_id", user.id)
        .in("job_post_id", postIdsForData)
        .gte("created_at", sevenDaysAgo);
      for (const ev of shareEvents ?? []) {
        const e = ev as { job_post_id: string; event_type: string };
        const prev = shareStatsByPost.get(e.job_post_id) ?? { open: 0, apply: 0 };
        if (e.event_type === "share_open") prev.open += 1;
        if (e.event_type === "share_apply") prev.apply += 1;
        shareStatsByPost.set(e.job_post_id, prev);
      }
    }

  }

  const applicantsData =
    viewMode !== "applicants"
      ? null
      : positionIds.length === 0
        ? {
            rows: [],
            totalFiltered: 0,
            totalAll: 0,
            pendingTotal: 0,
            page: 1,
            pageSize: MANAGE_APPLICANTS_PAGE_SIZE,
            pageCount: 0,
            hitFetchCap: false,
          }
        : await loadManageApplicantsData({
            authSupabase,
            supabasePublic: supabase,
            jobPosts: applicantsPostsMeta,
            positions: positionRows,
            categoryMap,
            params: applicantsParams,
            allPositionIds: positionIds,
            ownerApplicationTotals,
          });

  const jobPostsForFilter = applicantsPostsMeta.map((p) => ({
    id: p.id,
    title: p.title,
    work_date: p.work_date,
  }));

  function sortPostsByApplications(posts: ManageJobPostRow[]): ManageJobPostRow[] {
    return [...posts].sort((a, b) => {
      const countA = Number(applicationCountByPost.get(a.id)) || 0;
      const countB = Number(applicationCountByPost.get(b.id)) || 0;
      if (countB !== countA) return countB - countA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  const sortedListPosts = viewMode === "list" ? sortPostsByApplications(listPagePosts) : [];
  const calendarItems: ManageCalendarItem[] = (() => {
    if (viewMode !== "calendar") return [];
    const sorted = sortPostsByApplications(calendarPosts);
    return sorted.map((post) => {
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
  })();

  const listHrefBase = listScope === "all" ? { scope: "all" as const } : {};
  const secondaryItems = [
    {
      key: "list",
      label: "목록",
      href:
        listScope === "all"
          ? "/jobs/manage?scope=all"
          : "/jobs/manage",
    },
    { key: "calendar", label: "달력", href: "/jobs/manage?view=calendar" },
    { key: "applicants", label: "전체 지원자", href: "/jobs/manage?view=applicants" },
  ];

  const listSection =
    viewMode === "list" ? (
      <div>
        {listScope === "active" && sortedListPosts.length === 0 && (userPostCount ?? 0) > 0 ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
            진행·최근 구인글이 없습니다.{" "}
            <Link href="/jobs/manage/archive" className="font-medium text-amber-950 underline">
              아카이브
            </Link>
            에서 오래된 마감 글을 보거나,{" "}
            <Link href="/jobs/manage?scope=all" className="font-medium text-amber-950 underline">
              전체 보기
            </Link>
            로 전환해 보세요.
          </p>
        ) : null}
        {listScope === "active" ? (
          <p className="mb-3 text-xs text-slate-500">
            기본 목록은 <strong>모집 중</strong>과 <strong>작업일 기준 30일 이내 마감</strong> 글만 보여 줍니다.{" "}
            <Link href="/jobs/manage?scope=all" className="text-blue-600 hover:underline">
              마감 포함 전체
            </Link>
            {" · "}
            <Link href="/jobs/manage/archive" className="text-blue-600 hover:underline">
              아카이브
            </Link>
          </p>
        ) : (
          <p className="mb-3 text-xs text-slate-500">
            전체 목록입니다.{" "}
            <Link href="/jobs/manage" className="text-blue-600 hover:underline">
              진행·최근만 보기
            </Link>
            {" · "}
            <Link href="/jobs/manage/archive" className="text-blue-600 hover:underline">
              아카이브
            </Link>
          </p>
        )}
        <ManageJobPostCards
          sortedPosts={sortedListPosts}
          positionsByPost={positionsByPost}
          applicationCountByPost={applicationCountByPost}
          postIdsWithNoShow={postIdsWithNoShow}
          shareStatsByPost={shareStatsByPost}
          categoryMap={categoryMap}
        />
        <ManageListPagination
          page={listPageForPagination}
          totalCount={listTotalCount}
          basePath="/jobs/manage"
          extra={{
            ...listHrefBase,
          }}
        />
      </div>
    ) : (
      <div />
    );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
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
      <JobsPrimaryTabs
        active="posted"
        allHref="/jobs"
        postedHref="/jobs/manage"
        appliedHref="/jobs?mine=applied"
        matchesHref="/jobs/matches"
      />
      <JobsSecondaryTabs activeKey={viewMode} items={secondaryItems} />

      <ManageView
        calendarItems={calendarItems}
        listView={listSection}
        applicantsView={
          applicantsData ? (
            <ManageApplicantsView
              applicants={applicantsData.rows}
              jobPostsForFilter={jobPostsForFilter}
              query={applicantsParams}
              totalFiltered={applicantsData.totalFiltered}
              totalAll={applicantsData.totalAll}
              pendingTotal={applicantsData.pendingTotal}
              page={applicantsData.page}
              pageSize={applicantsData.pageSize}
              pageCount={applicantsData.pageCount}
              hitFetchCap={applicantsData.hitFetchCap}
            />
          ) : null
        }
        viewMode={viewMode}
      />
    </div>
  );
}
