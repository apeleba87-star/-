import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { insertJobShareEvent } from "@/lib/jobs/share-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  post_id?: string;
  event_type?: "share_click";
  channel?: string;
  ref?: string;
  meta?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  const postId = (body?.post_id ?? "").trim();
  if (!postId) return NextResponse.json({ ok: false, error: "post_id가 필요합니다." }, { status: 400 });
  if (body?.event_type !== "share_click") {
    return NextResponse.json({ ok: false, error: "허용되지 않은 이벤트입니다." }, { status: 400 });
  }

  const { data: post } = await authSupabase.from("job_posts").select("id, user_id").eq("id", postId).maybeSingle();
  if (!post) return NextResponse.json({ ok: false, error: "구인글을 찾을 수 없습니다." }, { status: 404 });

  const service = createServiceSupabase();
  await insertJobShareEvent({
    supabase: service,
    jobPostId: post.id,
    ownerUserId: post.user_id,
    actorUserId: user.id,
    eventType: "share_click",
    channel: body?.channel ?? "unknown",
    ref: body?.ref ?? "jobs_share_button",
    userAgent: req.headers.get("user-agent"),
    meta: body?.meta ?? null,
  });

  return NextResponse.json({ ok: true });
}

