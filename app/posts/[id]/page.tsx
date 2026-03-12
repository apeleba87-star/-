import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { getActivePostDetailAds } from "@/lib/ads";
import AdNativeCard from "@/components/home/AdNativeCard";
import { aggregateDailyTenders } from "@/lib/content/tender-report-queries";
import { buildInsightSentence } from "@/lib/content/tender-report-formatters";
import { getKstDateString } from "@/lib/content/kst-utils";
import DailyTenderReportDashboard from "@/components/report/DailyTenderReportDashboard";
import ReportPaywallLock from "@/components/report/ReportPaywallLock";

export const revalidate = 60;

function getReportDate(post: { source_ref?: string | null; slug?: string | null }): string | null {
  if (post.source_ref && /^\d{4}-\d{2}-\d{2}$/.test(post.source_ref)) return post.source_ref;
  const slug = typeof post.slug === "string" ? post.slug : "";
  const m = /-(\d{4}-\d{2}-\d{2})-daily-tender-digest$/.exec(slug);
  return m ? m[1] : null;
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  let reportData: { payload: Awaited<ReturnType<typeof aggregateDailyTenders>>; insightSentence: string } | null = null;
  const resolvedPost = (error || !post ? null : post) ?? null;

  if (resolvedPost && isReportPost(resolvedPost)) {
    const reportDate = getReportDate(resolvedPost);
    if (reportDate) {
      try {
        const payload = await aggregateDailyTenders(supabase, new Date(`${reportDate}T12:00:00Z`));
        reportData = { payload, insightSentence: buildInsightSentence(payload) };
      } catch {
        reportData = null;
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
    if (isReportPost(slugPost) && !reportData) {
      const reportDate = getReportDate(slugPost);
      if (reportDate) {
        try {
          const payload = await aggregateDailyTenders(supabase, new Date(`${reportDate}T12:00:00Z`));
          reportData = { payload, insightSentence: buildInsightSentence(payload) };
        } catch {
          // keep null
        }
      }
    }
    const reportLocked = await getReportLocked(slugPost, reportData);
    return renderPost(slugPost, adsResult, reportData, reportLocked);
  }
  const reportLocked = await getReportLocked(post!, reportData);
  return renderPost(post!, adsResult, reportData, reportLocked);
}

async function getReportLocked(
  post: PostForRender,
  reportData: ReportData | null
): Promise<boolean> {
  if (!isReportPost(post) || !reportData) return false;
  const reportDate = getReportDate(post);
  const todayKst = getKstDateString();
  if (!reportDate || reportDate >= todayKst) return false;
  const authSupabase = await createServerSupabase();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return true;
  const { data: profile } = await authSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role;
  if (role === "admin" || role === "editor") return false;
  const { data: sub } = await authSupabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (sub) return false;
  const { data: grant } = await authSupabase
    .from("report_share_grants")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", post.id)
    .eq("grant_date", todayKst)
    .is("used_at", null)
    .maybeSingle();
  if (grant) {
    await authSupabase
      .from("report_share_grants")
      .update({ used_at: new Date().toISOString() })
      .eq("id", grant.id);
    return false;
  }
  return true;
}

type PostForRender = {
  id: string;
  title: string;
  body: string | null;
  excerpt: string | null;
  published_at: string | null;
  source_type?: string | null;
  source_ref?: string | null;
  slug?: string | null;
  category?: { slug: string; name: string } | null;
};

type PostDetailAds = Awaited<ReturnType<typeof getActivePostDetailAds>>;
type ReportData = { payload: Awaited<ReturnType<typeof aggregateDailyTenders>>; insightSentence: string };

/** 자동 생성 입찰 리포트 여부: source_type 있거나 slug가 일간 디제스트 패턴이면 리포트 */
function isReportPost(post: PostForRender): boolean {
  if (post.source_type) return true;
  const slug = typeof post.slug === "string" ? post.slug : "";
  return slug.endsWith("-daily-tender-digest") || /-\d{4}-\d{2}-\d{2}-daily-tender-digest$/.test(slug);
}

function renderPost(
  post: PostForRender,
  ads: PostDetailAds,
  reportData: ReportData | null,
  reportLocked: boolean
) {
  const isReport = isReportPost(post);
  const showTopAd = ads.post_top?.enabled && ads.post_top.campaign;
  const showBottomAd = ads.post_bottom?.enabled && ads.post_bottom.campaign;
  const useDashboard = isReport && reportData;
  const showLock = useDashboard && reportLocked;

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-6 sm:px-6 sm:py-10">
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
          {showTopAd && ads.post_top?.campaign && (
            <div className="mb-6">
              <AdNativeCard campaign={ads.post_top.campaign} />
            </div>
          )}
          <DailyTenderReportDashboard
            payload={reportData!.payload}
            title={post.title}
            dateLabel={reportData!.payload.dateLabel}
            insightSentence={reportData!.insightSentence}
            excerpt={post.excerpt}
          />
          {showBottomAd && ads.post_bottom?.campaign && (
            <div className="mt-8">
              <AdNativeCard campaign={ads.post_bottom.campaign} />
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

          {showTopAd && ads.post_top?.campaign && (
            <div className="mt-6">
              <AdNativeCard campaign={ads.post_top.campaign} />
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

          {showBottomAd && ads.post_bottom?.campaign && (
            <div className="mt-8">
              <AdNativeCard campaign={ads.post_bottom.campaign} />
            </div>
          )}
        </article>
      )}
    </div>
  );
}
