import { createClient } from "@/lib/supabase-server";
import { REPORT_TYPE_LABELS } from "@/lib/content/report-snapshot-types";

type SupabaseServerClient = ReturnType<typeof createClient>;

export type RelatedReportPostRow = {
  id: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  slug: string | null;
  source_type: string | null;
  source_ref: string | null;
};

/** posts 조회용: 일간 입찰·낙찰·스냅샷 리포트 전부 */
export function buildReportPostsOrFilter(): string {
  const snapshotTypes = Object.keys(REPORT_TYPE_LABELS);
  return [
    "source_type.eq.auto_tender_daily",
    "slug.ilike.*daily-tender-digest*",
    ...snapshotTypes.map((t) => `source_type.eq.${t}`),
  ].join(",");
}

function isDailyTenderReportPost(post: { source_type?: string | null; slug?: string | null }): boolean {
  if (post.source_type === "auto_tender_daily") return true;
  const slug = typeof post.slug === "string" ? post.slug : "";
  return slug.endsWith("-daily-tender-digest") || /-\d{4}-\d{2}-\d{2}-daily-tender-digest$/.test(slug);
}

/** 글 상세·관련 리포트: 자동 리포트 글 여부 (posts.source_type 또는 일간 디제스트 slug) */
export function isReportPost(post: { source_type?: string | null; slug?: string | null }): boolean {
  if (post.source_type) return true;
  const slug = typeof post.slug === "string" ? post.slug : "";
  return slug.endsWith("-daily-tender-digest") || /-\d{4}-\d{2}-\d{2}-daily-tender-digest$/.test(slug);
}

export type ReportKind = "daily" | "award" | "snapshot";

export function classifyReportKind(post: {
  source_type?: string | null;
  slug?: string | null;
}): ReportKind {
  if (isDailyTenderReportPost(post)) return "daily";
  if (post.source_type === "award_market_intel") return "award";
  return "snapshot";
}

/** 최근 글 중에서 다른 유형이 섞이도록 최대 `limit`개 선택 */
function pickDiverseRelated(
  rows: RelatedReportPostRow[],
  current: { id: string; source_type?: string | null; slug?: string | null },
  limit: number
): RelatedReportPostRow[] {
  const curKind = classifyReportKind(current);
  const byKind: Record<ReportKind, RelatedReportPostRow[]> = { daily: [], award: [], snapshot: [] };
  for (const r of rows) {
    byKind[classifyReportKind(r)].push(r);
  }
  const order: ReportKind[] =
    curKind === "daily"
      ? ["award", "snapshot", "daily"]
      : curKind === "award"
        ? ["daily", "snapshot", "award"]
        : ["daily", "award", "snapshot"];
  const out: RelatedReportPostRow[] = [];
  let round = 0;
  while (out.length < limit && round < 20) {
    let added = false;
    for (const k of order) {
      const list = byKind[k];
      if (list[round]) {
        out.push(list[round]);
        added = true;
        if (out.length >= limit) break;
      }
    }
    if (!added) break;
    round++;
  }
  if (out.length < limit) {
    for (const r of rows) {
      if (out.some((x) => x.id === r.id)) continue;
      out.push(r);
      if (out.length >= limit) break;
    }
  }
  return out.slice(0, limit);
}

export async function getRelatedReportPosts(
  supabase: SupabaseServerClient,
  current: { id: string; source_type?: string | null; slug?: string | null }
): Promise<RelatedReportPostRow[]> {
  const orFilter = buildReportPostsOrFilter();
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, excerpt, published_at, slug, source_type, source_ref")
    .neq("id", current.id)
    .eq("is_private", false)
    .not("published_at", "is", null)
    .or(orFilter)
    .order("published_at", { ascending: false })
    .limit(28);

  if (error || !data?.length) return [];
  return pickDiverseRelated(data as RelatedReportPostRow[], current, 4);
}

/** 마케팅 리포트 등 허브: 입찰·낙찰·스냅샷이 섞이도록 최근 글만 (현재 글 제외 없음) */
export async function getCrossReportDiscoveryPosts(
  supabase: SupabaseServerClient,
  limit: number
): Promise<RelatedReportPostRow[]> {
  const orFilter = buildReportPostsOrFilter();
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, excerpt, published_at, slug, source_type, source_ref")
    .eq("is_private", false)
    .not("published_at", "is", null)
    .or(orFilter)
    .order("published_at", { ascending: false })
    .limit(28);

  if (error || !data?.length) return [];
  return pickDiverseRelated(data as RelatedReportPostRow[], { id: "", source_type: null, slug: "" }, limit);
}
