import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { runTenderFetch } from "@/lib/g2b/fetch-tenders";

export const dynamic = "force-dynamic";

/**
 * 관리자 전용: 나라장터(G2B) 입찰 수집 수동 실행
 * - 로그인 + admin/editor 권한 필요
 * - 추후 cron으로 자동 실행 시에는 /api/cron/fetch-g2b 사용
 */
export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await runTenderFetch({ daysBack: 3 });
    return NextResponse.json({
      ok: result.ok,
      tenders: result.tenders,
      inserted: result.inserted,
      updated: result.updated,
      error: result.error,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
