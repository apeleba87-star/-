import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getKstDateString } from "@/lib/content/kst-utils";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "로그인 후 공유하면 1회 열람이 가능합니다." },
      { status: 401 }
    );
  }
  let body: { post_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "post_id가 필요합니다." }, { status: 400 });
  }
  const postId = body.post_id;
  if (!postId || typeof postId !== "string") {
    return NextResponse.json({ ok: false, error: "post_id가 필요합니다." }, { status: 400 });
  }
  const { data: post } = await supabase
    .from("posts")
    .select("id, source_type")
    .eq("id", postId)
    .not("published_at", "is", null)
    .maybeSingle();
  if (!post || (post as { source_type?: string }).source_type !== "auto_tender_daily") {
    return NextResponse.json({ ok: false, error: "해당 글이 없거나 공유 대상이 아닙니다." }, { status: 400 });
  }
  const grantDate = getKstDateString();
  const { error: insertError } = await supabase
    .from("report_share_grants")
    .insert({ user_id: user.id, post_id: postId, grant_date: grantDate });
  if (!insertError) {
    return NextResponse.json({
      ok: true,
      message: "공유가 완료되었습니다. 이제 열람할 수 있습니다.",
    });
  }
  if (insertError.code === "23505") {
    const { data: existing } = await supabase
      .from("report_share_grants")
      .select("used_at")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .eq("grant_date", grantDate)
      .single();
    if (existing?.used_at) {
      return NextResponse.json({
        ok: false,
        error: "오늘은 이미 열람하셨습니다. 내일 다시 공유해 주세요.",
      });
    }
    return NextResponse.json({
      ok: true,
      message: "이미 열람 가능합니다. 새로고침 해 주세요.",
    });
  }
  return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
}
