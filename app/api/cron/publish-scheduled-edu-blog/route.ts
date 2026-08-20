/**
 * 예약 발행된 청소지식(edu_blog)·청소업 실무(practice_blog) 글을 정시에 공개하는 cron.
 * 공개 필터는 published_at <= now() 이므로 DB 상태를 바꿀 필요는 없고,
 * ISR/SSG 페이지를 재검증해 예약 시각에 맞춰 노출시킨다.
 *
 * 최근 창(기본 30분) 안에 발행 시각이 지난 글을 찾아 해당 경로를 revalidate.
 * cron이 한 번 실패해도 다음 실행에서 커버되도록 창을 실행 주기보다 넉넉히 둔다.
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceSupabase } from "@/lib/supabase-server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { EDU_BLOG_SOURCE_TYPE } from "@/lib/edu-blog/constants";
import { PRACTICE_BLOG_SOURCE_TYPE, practiceBlogPath } from "@/lib/practice-blog/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LOOKBACK_MS = 30 * 60 * 1000;

export async function GET(req: NextRequest) {
  return handlePublishScheduled(req);
}

export async function POST(req: NextRequest) {
  return handlePublishScheduled(req);
}

async function handlePublishScheduled(req: NextRequest): Promise<NextResponse> {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    // ?window=분 으로 조회 창 조정, ?all=true 로 최근 창 무시하고 목록만 재검증
    const windowMin = Number(searchParams.get("window"));
    const lookbackMs =
      Number.isFinite(windowMin) && windowMin > 0 ? windowMin * 60 * 1000 : LOOKBACK_MS;
    const all = searchParams.get("all") === "true";

    const now = new Date();
    const nowIso = now.toISOString();
    const windowStartIso = new Date(now.getTime() - lookbackMs).toISOString();

    const supabase = createServiceSupabase();

    let query = supabase
      .from("posts")
      .select("slug, published_at, source_type")
      .in("source_type", [EDU_BLOG_SOURCE_TYPE, PRACTICE_BLOG_SOURCE_TYPE])
      .eq("is_private", false)
      .not("slug", "is", null)
      .not("published_at", "is", null)
      .lte("published_at", nowIso);

    if (!all) {
      query = query.gte("published_at", windowStartIso);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as { slug: string | null; source_type: string | null }[];
    const eduSlugs = [
      ...new Set(
        rows
          .filter((r) => r.source_type === EDU_BLOG_SOURCE_TYPE)
          .map((r) => r.slug)
          .filter((s): s is string => !!s)
      ),
    ];
    const practiceSlugs = [
      ...new Set(
        rows
          .filter((r) => r.source_type === PRACTICE_BLOG_SOURCE_TYPE)
          .map((r) => r.slug)
          .filter((s): s is string => !!s)
      ),
    ];

    revalidatePath("/blog");
    revalidatePath("/practice");
    revalidatePath("/sitemap.xml");
    for (const slug of eduSlugs) {
      revalidatePath(`/blog/${encodeURIComponent(slug)}`);
    }
    for (const slug of practiceSlugs) {
      revalidatePath(practiceBlogPath(slug));
    }

    return NextResponse.json({
      ok: true,
      revalidated: eduSlugs.length + practiceSlugs.length,
      slugs: eduSlugs,
      practice_slugs: practiceSlugs,
      window_start: all ? null : windowStartIso,
      now: nowIso,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[publish-scheduled-edu-blog]", message, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
