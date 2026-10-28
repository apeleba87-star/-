import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { ensureAiBlogTrial } from "@/lib/ai-blog/trial";

/** 무료 체험(3일·3개) 수동 클레임. 레이아웃에서도 자동 부여하지만, CTA용으로 공개. */
export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const result = await ensureAiBlogTrial(user.id);
  if (!result.granted) {
    return NextResponse.json({
      ok: true,
      granted: false,
      reason: result.reason,
      expires_on: result.expires_on ?? null,
    });
  }
  return NextResponse.json({
    ok: true,
    granted: true,
    expires_on: result.expires_on,
  });
}
