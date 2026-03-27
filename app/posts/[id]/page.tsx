import Link from "next/link";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Metadata } from "next";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { getActivePostDetailAds } from "@/lib/ads";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";
import type { DailyTenderPayload } from "@/lib/content/tender-report-queries";
import { resolvePremiumAgencyAndBudgetBands } from "@/lib/content/tender-report-queries";
import { getCachedDailyTenderPayload, getCachedWeeklyTenderPayload } from "@/lib/content/tender-report-cache";
import { buildInsightSentence } from "@/lib/content/tender-report-formatters";
import { getKstDateString } from "@/lib/content/kst-utils";
import { hasSubscriptionAccess } from "@/lib/subscription-access";
import { ensureSharedRevealKeys, kstCalendarMinusDays, type SharedRandomPanelKey } from "@/lib/report/share-unlock-panels";
import ReportPaywallLock from "@/components/report/ReportPaywallLock";

const DailyTenderReportDashboard = dynamic(
  () => import("@/components/report/DailyTenderReportDashboard"),
  {
    loading: () => (
      <div className="mx-auto min-w-0 max-w-[1400px] px-3 py-8 xs:px-4 sm:px-6">
        <div className="h-72 animate-pulse rounded-2xl bg-slate-100/90 sm:h-96" />
      </div>
    ),
  }
);
import ReportSnapshotView from "@/components/report/ReportSnapshotView";

export const revalidate = 60;

type PostPageParams = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PostPageParams): Promise<Metadata> {
  const { id } = await params;
  const supabase = createClient();
  const byId = await supabase.from("posts").select("title, excerpt, is_private").eq("id", id).not("published_at", "is", null).single();
  const post = byId.data ?? (await supabase.from("posts").select("title, excerpt, is_private").eq("slug", id).not("published_at", "is", null).single()).data;
  if (!post) return {};
  if ((post as { is_private?: boolean }).is_private) return { title: "비공개", robots: { index: false, follow: false } };
  const title = (post.title ?? "").trim() || "글";
  const description = (post.excerpt ?? "").trim().slice(0, 160) || undefined;
  return { title, description };
}

function getReportDate(post: { source_ref?: string | null; slug?: string | null }): string | null {
  if (post.source_ref && /^\d{4}-\d{2}-\d{2}$/.test(post.source_ref)) return post.source_ref;
  const slug = typeof post.slug === "string" ? post.slug : "";
  const m = /-(\d{4}-\d{2}-\d{2})-daily-tender-digest$/.exec(slug);
  return m ? m[1] : null;
}

/** 비공개 글은 관리자·에디터만 접근. 아니면 notFound */
async function ensurePrivateAccess(
  post: { is_private?: boolean },
  authSupabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string
): Promise<void> {
  if (!(post as { is_private?: boolean }).is_private) return;
  const { data: profile } = await authSupabase.from("profiles").select("role").eq("id", userId).single();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") notFound();
}

export default async function PostPage({ params }: PostPageParams) {
  const { id } = await params;
  const authSupabase = await createServerSupabase();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/posts/${id}`)}`);
  }

  const supabase = createClient();
  const [adsResult, { data: post, error }] = await Promise.all([
    getActivePostDetailAds(),
    supabase
      .from("posts")
      .select("*, category:content_categories(id, slug, name)")
      .eq("id", id)
      .not("published_at", "is", null)
      .single(),
  ]);

  let reportData: { payload: DailyTenderPayload; insightSentence: string } | null = null;
  const resolvedPost = (error || !post ? null : post) ?? null;

  if (resolvedPost && isReportPost(resolvedPost)) {
    const snapshot = (resolvedPost as { report_snapshot?: DailyTenderPayload | null }).report_snapshot;
    if (snapshot && typeof snapshot === "object" && typeof snapshot.count_total === "number") {
      reportData = { payload: snapshot as DailyTenderPayload, insightSentence: buildInsightSentence(snapshot as DailyTenderPayload) };
    } else {
      const reportDate = getReportDate(resolvedPost);
      if (reportDate) {
        try {
          const payload = await getCachedDailyTenderPayload(reportDate);
          reportData = { payload, insightSentence: buildInsightSentence(payload) };
        } catch {
          reportData = null;
        }
      }
    }
  }

  if (error || !post) {
    const bySlug = await supabase
      .from("posts")
      .select("*, category:content_categories(id, slug, name)")
      .eq("slug", id)
      .not("published_at", "is", null)
      .single();
    if (bySlug.error || !bySlug.data) notFound();
    const slugPost = bySlug.data;
    await ensurePrivateAccess(slugPost, authSupabase, user.id);
    if (isReportPost(slugPost) && !reportData) {
      const snapshot = (slugPost as { report_snapshot?: DailyTenderPayload | null }).report_snapshot;
      if (snapshot && typeof snapshot === "object" && typeof snapshot.count_total === "number") {
        reportData = { payload: snapshot as DailyTenderPayload, insightSentence: buildInsightSentence(snapshot as DailyTenderPayload) };
      } else {
        const reportDate = getReportDate(slugPost);
        if (reportDate) {
          try {
            const payload = await getCachedDailyTenderPayload(reportDate);
            reportData = { payload, insightSentence: buildInsightSentence(payload) };
          } catch {
            // keep null
          }
        }
      }
    }
    const [reportAccess, premiumInsights] = await Promise.all([
      getReportAccess(slugPost, reportData, supabase),
      getPremiumInsights(reportData),
    ]);
    return renderPost(slugPost, adsResult, reportData, reportAccess, premiumInsights);
  }
  await ensurePrivateAccess(post, authSupabase, user.id);
  const [reportAccess, premiumInsights] = await Promise.all([
    getReportAccess(post!, reportData, supabase),
    getPremiumInsights(reportData),
  ]);
  return renderPost(post!, adsResult, reportData, reportAccess, premiumInsights);
}

type ReportAccessState = {
  level: "free" | "shared" | "premium";
  sharedRevealKeys: SharedRandomPanelKey[] | null;
};

async function getReportAccess(
  post: PostForRender,
  reportData: ReportData | null,
  _supabase: ReturnType<typeof createClient>
): Promise<ReportAccessState> {
  const none: ReportAccessState = { level: "free", sharedRevealKeys: null };
  if (!isReportPost(post) || !reportData) return none;
  const authSupabase = await createServerSupabase();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return none;
  const { data: profile } = await authSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role;
  if (role === "admin" || role === "editor") {
    return { level: "premium", sharedRevealKeys: null };
  }
  const todayKst = getKstDateString();
  const { data: sub } = await authSupabase
    .from("subscriptions")
    .select("id, status, next_billing_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (hasSubscriptionAccess(sub as { status: string; next_billing_at?: string | null } | null, todayKst)) {
    return { level: "premium", sharedRevealKeys: null };
  }

  const { data: todayGrant } = await authSupabase
    .from("report_share_grants")
    .select("post_id, revealed_panel_keys")
    .eq("user_id", user.id)
    .eq("grant_date", todayKst)
    .maybeSingle();

  if (todayGrant && todayGrant.post_id === post.id) {
    const keys = ensureSharedRevealKeys(
      user.id,
      post.id,
      todayKst,
      (todayGrant as { revealed_panel_keys?: string[] | null }).revealed_panel_keys
    );
    return { level: "shared", sharedRevealKeys: keys };
  }

  return none;
}

type PostForRender = {
  id: string;
  title: string;
  body: string | null;
  excerpt: string | null;
  published_at: string | null;
  updated_at?: string | null;
  source_type?: string | null;
  source_ref?: string | null;
  slug?: string | null;
  category?: { slug: string; name: string } | null;
  report_snapshot?: unknown;
};

type PostDetailAds = Awaited<ReturnType<typeof getActivePostDetailAds>>;
type ReportData = { payload: DailyTenderPayload; insightSentence: string };
type PremiumInsights = {
  weekCompare: { currentWeekCount: number; prevWeekCount: number; deltaPct: number | null };
  drilldown: { topRegions: { name: string; count: number }[]; topIndustries: { name: string; count: number }[] };
  agencies: { name: string; count: number }[];
  budgetBands: { label: string; count: number }[];
  anomalies: string[];
} | null;

async function getPremiumInsights(reportData: ReportData | null): Promise<PremiumInsights> {
  if (!reportData) return null;
  const baseDate = reportData.payload.date ? new Date(`${reportData.payload.date}T12:00:00Z`) : new Date();
  const baseYmd =
    reportData.payload.date && /^\d{4}-\d{2}-\d{2}$/.test(reportData.payload.date)
      ? reportData.payload.date
      : getKstDateString(baseDate);
  const prevYmd = kstCalendarMinusDays(baseYmd, 7);
  let currentWeekCount = 0;
  let prevWeekCount = 0;
  try {
    const [currentWeek, prevWeek] = await Promise.all([
      getCachedWeeklyTenderPayload(baseYmd),
      getCachedWeeklyTenderPayload(prevYmd),
    ]);
    currentWeekCount = currentWeek.count_total;
    prevWeekCount = prevWeek.count_total;
  } catch {
    currentWeekCount = 0;
    prevWeekCount = 0;
  }
  const deltaPct = prevWeekCount > 0 ? Number((((currentWeekCount - prevWeekCount) / prevWeekCount) * 100).toFixed(1)) : null;

  const topRegions = reportData.payload.region_breakdown.slice(0, 5);
  const topIndustries = (reportData.payload.industry_breakdown ?? [])
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((i) => ({ name: i.industry_name, count: i.count }));
  const { agencies: resolvedAgencies, budgetBands: resolvedBands } = resolvePremiumAgencyAndBudgetBands(
    reportData.payload
  );
  const agencies = resolvedAgencies.slice(0, 5);
  const budgetBands = resolvedBands;
  const anomalies: string[] = [];
  const topRegionShare =
    reportData.payload.count_total > 0 && reportData.payload.region_breakdown[0]
      ? Math.round((reportData.payload.region_breakdown[0].count / reportData.payload.count_total) * 100)
      : 0;
  if (topRegionShare >= 45) anomalies.push(`상위 지역 집중도 높음 (${topRegionShare}%)`);
  if (reportData.payload.has_budget_unknown) anomalies.push("금액 미기재 공고 포함");
  if ((reportData.payload.deadline_soon_tenders ?? []).length >= 4) anomalies.push("마감 임박 공고 다수");
  if ((reportData.payload.top_budget_tenders ?? []).length > 0 && (reportData.payload.top_budget_tenders[0]?.budget ?? 0) >= 300_000_000) {
    anomalies.push("초고액 공고 출현");
  }

  return {
    weekCompare: { currentWeekCount, prevWeekCount, deltaPct },
    drilldown: { topRegions, topIndustries },
    agencies,
    budgetBands,
    anomalies,
  };
}

/** 자동 생성 입찰 리포트 여부: source_type 있거나 slug가 일간 디제스트 패턴이면 리포트 */
function isReportPost(post: PostForRender): boolean {
  if (post.source_type) return true;
  const slug = typeof post.slug === "string" ? post.slug : "";
  return slug.endsWith("-daily-tender-digest") || /-\d{4}-\d{2}-\d{2}-daily-tender-digest$/.test(slug);
}

/** 스냅샷 리포트(주간 시장 요약, 마감 임박 등) 여부: report_snapshot 구조화 콘텐츠 있음 */
function isSnapshotReport(post: PostForRender): boolean {
  if (!post.source_type || post.source_type === "auto_tender_daily") return false;
  const snap = post.report_snapshot;
  if (!snap || typeof snap !== "object") return false;
  const o = snap as Record<string, unknown>;
  return Array.isArray(o.key_metrics) || typeof o.headline === "string";
}

function renderPost(
  post: PostForRender,
  ads: PostDetailAds,
  reportData: ReportData | null,
  reportAccess: ReportAccessState,
  premiumInsights: PremiumInsights
) {
  const isReport = isReportPost(post);
  const showTopAd = ads.post_top?.enabled && (ads.post_top.campaign || ads.post_top.script_content);
  const showBottomAd = ads.post_bottom?.enabled && (ads.post_bottom.campaign || ads.post_bottom.script_content);
  const useDashboard = isReport && reportData;
  const showLock = false;

  return (
    <div className="mx-auto min-w-0 max-w-[1400px] px-3 py-6 xs:px-4 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <Link href="/categories" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← 카테고리
      </Link>

      {showLock ? (
        <ReportPaywallLock
          postId={post.id}
          loginReturnPath={`/posts/${post.id}`}
          title={post.title}
          excerpt={post.excerpt}
          dateLabel={reportData?.payload.dateLabel}
        />
      ) : useDashboard ? (
        <>
          {showTopAd && ads.post_top && (
            <div className="mb-6">
              <AdSlotRenderer slot={ads.post_top} variant="card" />
            </div>
          )}
          <DailyTenderReportDashboard
            postId={post.id}
            payload={reportData!.payload}
            title={post.title}
            dateLabel={reportData!.payload.dateLabel}
            insightSentence={reportData!.insightSentence}
            excerpt={post.excerpt}
            updatedAt={post.updated_at ?? null}
            accessLevel={reportAccess.level}
            sharedRevealKeys={reportAccess.sharedRevealKeys}
            premiumInsights={premiumInsights}
          />
          {showBottomAd && ads.post_bottom && (
            <div className="mt-8">
              <AdSlotRenderer slot={ads.post_bottom} variant="card" />
            </div>
          )}
        </>
      ) : isReport && isSnapshotReport(post) && post.report_snapshot && typeof post.report_snapshot === "object" ? (
        <>
          {showTopAd && ads.post_top && (
            <div className="mb-6">
              <AdSlotRenderer slot={ads.post_top} variant="card" />
            </div>
          )}
          <ReportSnapshotView
            title={post.title}
            excerpt={post.excerpt}
            sourceType={post.source_type ?? ""}
            content={post.report_snapshot as Parameters<typeof ReportSnapshotView>[0]["content"]}
            updatedAt={post.updated_at ?? null}
          />
          {showBottomAd && ads.post_bottom && (
            <div className="mt-8">
              <AdSlotRenderer slot={ads.post_bottom} variant="card" />
            </div>
          )}
        </>
      ) : (
        <article className="card max-w-3xl">
          {post.category && (
            <span className="text-sm font-medium text-blue-600">{post.category.name}</span>
          )}
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{post.title}</h1>
          <time className="mt-2 block text-sm text-slate-500">
            {post.published_at
              ? new Date(post.published_at).toLocaleDateString("ko-KR")
              : ""}
          </time>
          {post.excerpt && <p className="mt-4 text-slate-600">{post.excerpt}</p>}

          {showTopAd && ads.post_top && (
            <div className="mt-6">
              <AdSlotRenderer slot={ads.post_top} variant="card" />
            </div>
          )}

          {post.body &&
            (isReport ? (
              <div className={`prose prose-slate mt-6 max-w-none post-report`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
              </div>
            ) : (
              <div className="prose prose-slate mt-6 max-w-none whitespace-pre-wrap">
                {post.body}
              </div>
            ))}

          {showBottomAd && ads.post_bottom && (
            <div className="mt-8">
              <AdSlotRenderer slot={ads.post_bottom} variant="card" />
            </div>
          )}
        </article>
      )}
    </div>
  );
}
