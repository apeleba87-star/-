import type { SupabaseClient } from "@supabase/supabase-js";
import { birthYearToAgeRangeLabel } from "@/lib/jobs/age-range";
import { getKstTodayString } from "@/lib/jobs/kst-date";
import type { ManageApplicantRow } from "@/components/jobs/ManageApplicantsView";
import type { ApplicationStatus } from "@/lib/jobs/types";
import {
  MANAGE_APPLICANTS_FETCH_CAP,
  MANAGE_APPLICANTS_PAGE_SIZE,
  type ManageApplicantsParsedParams,
} from "@/lib/jobs/manage-applicants-params";

type JobPostMini = {
  id: string;
  title: string;
  status: string;
  region: string;
  district: string | null;
  work_date: string | null;
};

type PositionMini = {
  id: string;
  job_post_id: string;
  category_main_id: string;
  category_sub_id: string | null;
  custom_subcategory_text: string | null;
  job_type_input: string | null;
  skill_level: string | null;
  required_count: number;
  filled_count: number;
};

type AppRow = {
  id: string;
  position_id: string;
  user_id: string;
  status: string;
  created_at: string;
};

function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function postIdsMatchingPeriod(
  posts: JobPostMini[],
  period: ManageApplicantsParsedParams["period"],
  todayStr: string
): Set<string> {
  const ids = new Set<string>();
  for (const p of posts) {
    const d = p.work_date?.slice(0, 10) ?? null;
    if (period === "all") {
      ids.add(p.id);
      continue;
    }
    if (period === "upcoming") {
      if (!d || d >= todayStr) ids.add(p.id);
      continue;
    }
    if (period === "past") {
      if (d != null && d < todayStr) ids.add(p.id);
    }
  }
  return ids;
}

function postIdsMatchingWorkRange(
  posts: JobPostMini[],
  workFrom: string,
  workTo: string,
  allowedPostIds: Set<string>
): Set<string> {
  const out = new Set<string>();
  for (const p of posts) {
    if (!allowedPostIds.has(p.id)) continue;
    const d = p.work_date?.slice(0, 10) ?? null;
    if (!d) {
      if (!workFrom && !workTo) out.add(p.id);
      continue;
    }
    if (workFrom && d < workFrom) continue;
    if (workTo && d > workTo) continue;
    out.add(p.id);
  }
  return out;
}

function positionDisplay(
  pos: PositionMini,
  categoryMap: Map<string, string>
): { label: string; skillLabel: string } {
  const skillLevelLabel: Record<string, string> = { expert: "숙련자(기공)", general: "일반(보조)" };
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

export type ManageApplicantsDataResult = {
  rows: ManageApplicantRow[];
  totalFiltered: number;
  totalAll: number;
  pendingTotal: number;
  page: number;
  pageSize: number;
  pageCount: number;
  hitFetchCap: boolean;
};

export async function loadManageApplicantsData(opts: {
  authSupabase: SupabaseClient;
  supabasePublic: SupabaseClient;
  jobPosts: JobPostMini[];
  positions: PositionMini[];
  categoryMap: Map<string, string>;
  params: ManageApplicantsParsedParams;
  /** For global pending / total counts (all posts owned by user). */
  allPositionIds: string[];
}): Promise<ManageApplicantsDataResult> {
  const { authSupabase, supabasePublic, jobPosts, positions, categoryMap, params, allPositionIds } = opts;
  const todayStr = getKstTodayString();
  const pageSize = MANAGE_APPLICANTS_PAGE_SIZE;

  let pendingTotal = 0;
  let totalAll = 0;
  if (allPositionIds.length > 0) {
    const { count: cAll } = await authSupabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .in("position_id", allPositionIds);
    totalAll = cAll ?? 0;

    const { count: cPen } = await authSupabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .in("position_id", allPositionIds)
      .in("status", ["applied", "reviewing"]);
    pendingTotal = cPen ?? 0;
  }

  let postIds = postIdsMatchingPeriod(jobPosts, params.period, todayStr);
  if (params.postId !== "all") {
    const only = new Set<string>();
    if (postIds.has(params.postId)) only.add(params.postId);
    postIds = only;
  }
  if (params.workFrom || params.workTo) {
    postIds = postIdsMatchingWorkRange(jobPosts, params.workFrom, params.workTo, postIds);
  }

  const allowedPositionIds = positions.filter((p) => postIds.has(p.job_post_id)).map((p) => p.id);

  if (allowedPositionIds.length === 0) {
    return {
      rows: [],
      totalFiltered: 0,
      totalAll,
      pendingTotal,
      page: 1,
      pageSize,
      pageCount: 0,
      hitFetchCap: false,
    };
  }

  let searchUserIds: string[] | null = null;
  if (params.q) {
    const safe = escapeIlikePattern(params.q);
    const pattern = `%${safe}%`;
    const [nicks, phones] = await Promise.all([
      supabasePublic.from("worker_profiles").select("user_id").ilike("nickname", pattern),
      supabasePublic.from("worker_profiles").select("user_id").ilike("contact_phone", pattern),
    ]);
    searchUserIds = [
      ...new Set([...(nicks.data ?? []), ...(phones.data ?? [])].map((r: { user_id: string }) => r.user_id)),
    ];
    if (searchUserIds.length === 0) {
      return {
        rows: [],
        totalFiltered: 0,
        totalAll,
        pendingTotal,
        page: params.page,
        pageSize,
        pageCount: 0,
        hitFetchCap: false,
      };
    }
  }

  let countQ = authSupabase
    .from("job_applications")
    .select("id", { count: "exact", head: true })
    .in("position_id", allowedPositionIds);
  if (params.status === "pending") {
    countQ = countQ.in("status", ["applied", "reviewing"]);
  } else if (params.status === "accepted") {
    countQ = countQ.eq("status", "accepted");
  } else if (params.status === "no_show_reported") {
    countQ = countQ.eq("status", "no_show_reported");
  }
  if (searchUserIds) countQ = countQ.in("user_id", searchUserIds);
  const { count: filteredCount, error: countErr } = await countQ;
  if (countErr) throw countErr;
  const totalFiltered = filteredCount ?? 0;

  let hitFetchCap = false;
  let apps: AppRow[] = [];

  if (params.sort === "applied_desc") {
    const pageCount = totalFiltered === 0 ? 0 : Math.max(1, Math.ceil(totalFiltered / pageSize));
    const page = pageCount === 0 ? 1 : Math.min(Math.max(1, params.page), pageCount);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let dataQ = authSupabase
      .from("job_applications")
      .select("id, position_id, user_id, status, created_at")
      .in("position_id", allowedPositionIds);
    if (params.status === "pending") {
      dataQ = dataQ.in("status", ["applied", "reviewing"]);
    } else if (params.status === "accepted") {
      dataQ = dataQ.eq("status", "accepted");
    } else if (params.status === "no_show_reported") {
      dataQ = dataQ.eq("status", "no_show_reported");
    }
    if (searchUserIds) dataQ = dataQ.in("user_id", searchUserIds);
    const { data, error } = await dataQ.order("created_at", { ascending: false }).range(from, to);
    if (error) throw error;
    apps = (data ?? []) as AppRow[];

    return finalizeRows(apps, {
      authSupabase,
      supabasePublic,
      jobPosts,
      positions,
      categoryMap,
      totalFiltered,
      totalAll,
      pendingTotal,
      page,
      pageSize,
      pageCount,
      hitFetchCap,
    });
  }

  let dataQ = authSupabase
    .from("job_applications")
    .select("id, position_id, user_id, status, created_at")
    .in("position_id", allowedPositionIds);
  if (params.status === "pending") {
    dataQ = dataQ.in("status", ["applied", "reviewing"]);
  } else if (params.status === "accepted") {
    dataQ = dataQ.eq("status", "accepted");
  } else if (params.status === "no_show_reported") {
    dataQ = dataQ.eq("status", "no_show_reported");
  }
  if (searchUserIds) dataQ = dataQ.in("user_id", searchUserIds);
  const { data: batchRaw, error: batchErr } = await dataQ
    .order("created_at", { ascending: false })
    .limit(MANAGE_APPLICANTS_FETCH_CAP);
  if (batchErr) throw batchErr;
  const batch = (batchRaw ?? []) as AppRow[];
  if (totalFiltered > MANAGE_APPLICANTS_FETCH_CAP) {
    hitFetchCap = true;
  }

  const postById = new Map(jobPosts.map((p) => [p.id, p]));
  const workKey = (positionId: string): string => {
    const pos = positions.find((x) => x.id === positionId);
    if (!pos) return "";
    const post = postById.get(pos.job_post_id);
    const wd = post?.work_date?.slice(0, 10) ?? "";
    return wd || "\uffff";
  };
  const mult = params.sort === "work_desc" ? -1 : 1;
  const sorted = [...batch].sort((a, b) => {
    const wa = workKey(a.position_id);
    const wb = workKey(b.position_id);
    if (wa !== wb) return wa < wb ? -mult : mult;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const effectiveTotal = hitFetchCap ? sorted.length : totalFiltered;
  const pageCount = effectiveTotal === 0 ? 0 : Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const page = pageCount === 0 ? 1 : Math.min(Math.max(1, params.page), pageCount);
  const start = (page - 1) * pageSize;
  apps = sorted.slice(start, start + pageSize);

  return finalizeRows(apps, {
    authSupabase,
    supabasePublic,
    jobPosts,
    positions,
    categoryMap,
    totalFiltered,
    totalAll,
    pendingTotal,
    page,
    pageSize,
    pageCount,
    hitFetchCap,
  });
}

async function finalizeRows(
  apps: AppRow[],
  ctx: {
    authSupabase: SupabaseClient;
    supabasePublic: SupabaseClient;
    jobPosts: JobPostMini[];
    positions: PositionMini[];
    categoryMap: Map<string, string>;
    totalFiltered: number;
    totalAll: number;
    pendingTotal: number;
    page: number;
    pageSize: number;
    pageCount: number;
    hitFetchCap: boolean;
  }
): Promise<ManageApplicantsDataResult> {
  const {
    authSupabase,
    supabasePublic,
    jobPosts,
    positions,
    categoryMap,
    totalFiltered,
    totalAll,
    pendingTotal,
    page,
    pageSize,
    pageCount,
    hitFetchCap,
  } = ctx;

  if (apps.length === 0) {
    return {
      rows: [],
      totalFiltered,
      totalAll,
      pendingTotal,
      page,
      pageSize,
      pageCount,
      hitFetchCap,
    };
  }

  const userIds = [...new Set(apps.map((a) => a.user_id))];
  const acceptedUserIds = [...new Set(apps.filter((a) => a.status === "accepted").map((a) => a.user_id))];

  const [{ data: workerProfiles }, acceptedPhoneByUser, noShowCountByUser] = await Promise.all([
    supabasePublic.from("worker_profiles").select("user_id, nickname, birth_date, gender, bio, contact_phone").in("user_id", userIds),
    (async (): Promise<Map<string, string | null>> => {
      if (acceptedUserIds.length === 0) return new Map();
      const { data: acceptedProfiles } = await authSupabase.from("profiles").select("id, phone").in("id", acceptedUserIds);
      return new Map(
        (acceptedProfiles ?? []).map((p) => [p.id, (p.phone ?? "").trim() || null])
      );
    })(),
    (async (): Promise<Map<string, number>> => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceIso = since.toISOString();
      const { data: noShowReports } = await supabasePublic
        .from("job_reports")
        .select("reported_user_id")
        .eq("reason_type", "no_show")
        .in("reported_user_id", userIds)
        .gte("created_at", sinceIso)
        .neq("status", "rescinded");
      const map = new Map<string, number>();
      for (const r of noShowReports ?? []) {
        map.set(r.reported_user_id, (map.get(r.reported_user_id) ?? 0) + 1);
      }
      return map;
    })(),
  ]);

  const profileByUser = new Map((workerProfiles ?? []).map((p) => [p.user_id, p]));
  const positionById = new Map(positions.map((p) => [p.id, p]));
  const postById = new Map(jobPosts.map((p) => [p.id, p]));

  const rows: ManageApplicantRow[] = apps.map((app) => {
    const pos = positionById.get(app.position_id);
    const post = pos ? postById.get(pos.job_post_id) : null;
    const profile = profileByUser.get(app.user_id);
    const { label, skillLabel } = pos ? positionDisplay(pos, categoryMap) : { label: "—", skillLabel: "" };
    const positionLabel = skillLabel ? `${label} / ${skillLabel}` : label;
    const birthYear = profile?.birth_date ? parseInt(String(profile.birth_date).slice(0, 4), 10) : null;
    const ageRangeLabel =
      birthYear != null && birthYear >= 1900 && birthYear <= 2100
        ? birthYearToAgeRangeLabel(birthYear)
        : "—";

    const contactPhone =
      app.status === "accepted"
        ? acceptedPhoneByUser.get(app.user_id) ?? (profile?.contact_phone?.trim() || null)
        : null;

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
      status: app.status as ApplicationStatus,
      noShowCountInPeriod: noShowCountByUser.get(app.user_id) ?? 0,
      createdAt: app.created_at,
      contactPhone: contactPhone || null,
    };
  });

  return {
    rows,
    totalFiltered,
    totalAll,
    pendingTotal,
    page,
    pageSize,
    pageCount,
    hitFetchCap,
  };
}
