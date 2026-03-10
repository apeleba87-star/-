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
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "DATA_GO_KR_SERVICE_KEY가 .env.local에 없습니다. 공공데이터포털에서 인증키(Encoding) 복사 후 추가하세요.",
    }, { status: 400 });
  }

  try {
    const result = await runTenderFetch({ daysBack: 3 });
    let errorMsg: string | undefined;
    if (!result.ok) {
      const raw = result.error;
      if (typeof raw === "string" && raw.trim()) {
        errorMsg = raw.trim();
      } else {
        errorMsg = raw != null ? `수집 실패 (원인: ${String(raw).replace(/^\[object Object\]$/i, "서버 응답 확인")})` : "수집 실패. 원인을 확인할 수 없습니다.";
      }
    }
    return NextResponse.json({
      ok: result.ok,
      tenders: result.tenders,
      inserted: result.inserted,
      updated: result.updated,
      error: errorMsg,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
