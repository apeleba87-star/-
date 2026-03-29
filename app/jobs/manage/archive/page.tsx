import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import ManageJobPostCards from "@/components/jobs/ManageJobPostCards";
import ManageListPagination from "@/components/jobs/ManageListPagination";
import JobsPrimaryTabs from "@/components/jobs/JobsPrimaryTabs";
import {
  buildArchivedClosedOrFilter,
  MANAGE_ARCHIVE_WORK_DAYS,
  MANAGE_LIST_PAGE_SIZE,
} from "@/lib/jobs/manage-list-scope";
import type { ManageJobPostRow } from "@/components/jobs/ManageJobPostCards";

export const dynamic = "force-dynamic";

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

function parsePage(raw: Record<string, string | string[] | undefined>): number {
  const p = typeof raw.page === "string" ? raw.page.trim() : "";
  if (!p) return 1;
  const n = parseInt(p, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function JobsManageArchivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params);

  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) redirect("/login?next=/jobs/manage/archive");

  const supabase = createClient();

  const { count: totalCount } = await authSupabase
    .from("job_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "closed")
    .or(buildArchivedClosedOrFilter());

  const total = totalCount ?? 0;
  const archivePageCount = total === 0 ? 1 : Math.max(1, Math.ceil(total / MANAGE_LIST_PAGE_SIZE));
  const effPage = Math.min(page, archivePageCount);
  const from = (effPage - 1) * MANAGE_LIST_PAGE_SIZE;
  const to = from + MANAGE_LIST_PAGE_SIZE - 1;

  const { data: rows } = await authSupabase
    .from("job_posts")
    .select("id, title, status, region, district, work_date, created_at, user_id, view_count")
    .eq("user_id", user.id)
    .eq("status", "closed")
    .or(buildArchivedClosedOrFilter())
    .order("created_at", { ascending: false })
    .range(from, to);

  const listPosts = (rows ?? []) as ManageJobPostRow[];
  const postIds = listPosts.map((p) => p.id);

  const { data: categories } = await supabase.from("categories").select("id, name, parent_id").in("usage", ["job", "default"]);
  const categoryMap = new Map<string, string>();
  for (const c of categories ?? []) {
    categoryMap.set(c.id, c.name);
  }

  const { data: positions } =
    postIds.length > 0
      ? await supabase
          .from("job_post_positions")
          .select(
            "id, job_post_id, category_main_id, category_sub_id, custom_subcategory_text, job_type_input, normalized_job_type_key, skill_level, required_count, filled_count, pay_amount, pay_unit, normalized_daily_wage, status"
          )
          .in("job_post_id", postIds)
          .order("sort_order", { ascending: true })
      : { data: [] as PositionRow[] };

  const positionRows = (positions ?? []) as PositionRow[];
  const positionsByPost = new Map<string, PositionRow[]>();
  for (const p of positionRows) {
    const list = positionsByPost.get(p.job_post_id) ?? [];
    list.push(p);
    positionsByPost.set(p.job_post_id, list);
  }

  const applicationCountByPost = new Map<string, number>();
  const positionIds = positionRows.map((p) => p.id);
  const postIdsWithNoShow = new Set<string>();
  const shareStatsByPost = new Map<string, { open: number; apply: number }>();

  if (postIds.length > 0) {
    const { data: countRows } = await supabase.rpc("get_job_post_application_counts", {
      post_ids: postIds,
    });
    for (const r of countRows ?? []) {
      const row = r as { job_post_id: string; application_count: number };
      applicationCountByPost.set(row.job_post_id, Number(row.application_count) || 0);
    }

    if (positionIds.length > 0) {
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
        .in("job_post_id", postIds)
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

  const sortedPosts = [...listPosts].sort((a, b) => {
    const countA = Number(applicationCountByPost.get(a.id)) || 0;
    const countB = Number(applicationCountByPost.get(b.id)) || 0;
    if (countB !== countA) return countB - countA;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">구인 아카이브</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            작업일 기준 {MANAGE_ARCHIVE_WORK_DAYS}일이 지난 마감 글만 모아 둡니다. 목록 로딩을 가볍게 유지합니다.
          </p>
        </div>
        <Link
          href="/jobs/manage"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← 내 구인 관리
        </Link>
      </div>

      <JobsPrimaryTabs
        active="posted"
        allHref="/jobs"
        postedHref="/jobs/manage"
        appliedHref="/jobs?mine=applied"
        matchesHref="/jobs/matches"
      />

      {total === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">아카이브에 해당하는 글이 없습니다.</p>
      ) : (
        <>
          <ManageJobPostCards
            sortedPosts={sortedPosts}
            positionsByPost={positionsByPost}
            applicationCountByPost={applicationCountByPost}
            postIdsWithNoShow={postIdsWithNoShow}
            shareStatsByPost={shareStatsByPost}
            categoryMap={categoryMap}
          />
          <ManageListPagination page={effPage} totalCount={total} basePath="/jobs/manage/archive" extra={{}} />
        </>
      )}
    </div>
  );
}
