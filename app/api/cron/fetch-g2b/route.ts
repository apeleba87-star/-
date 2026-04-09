import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createServiceSupabase } from "@/lib/supabase-server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { runTenderFetch, G2B_CRON_LOOKBACK_MINUTES } from "@/lib/g2b/fetch-tenders";
import { getG2bCronSkipReason } from "@/lib/g2b/g2b-cron-window";
import { refreshHomeSnapshotsAfterTenderIngest } from "@/lib/content/refresh-home-page-stats";

export const dynamic = "force-dynamic";
/** 수집이 오래 걸릴 수 있음 (Vercel Pro 등) */
export const maxDuration = 300;

async function handleCronFetch(): Promise<NextResponse> {
  const skipReason = getG2bCronSkipReason();
  if (skipReason) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: skipReason,
      lookbackMinutes: G2B_CRON_LOOKBACK_MINUTES,
    });
  }

  if (process.env.DATA_GO_KR_SERVICE_KEY) {
    try {
      const result = await runTenderFetch({ lookbackMinutes: G2B_CRON_LOOKBACK_MINUTES });
      if (result.ok) {
        revalidatePath("/tenders");
        revalidatePath("/");
        try {
          const serviceSupabase = createServiceSupabase();
          await refreshHomeSnapshotsAfterTenderIngest(serviceSupabase);
        } catch (_) {
          // 집계·스냅샷 갱신 실패해도 수집 결과는 반환
        }
      }
      return NextResponse.json({
        ok: result.ok,
        skipped: false,
        tenders: result.tenders,
        inserted: result.inserted,
        updated: result.updated,
        error: result.error,
        lookbackMinutes: G2B_CRON_LOOKBACK_MINUTES,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  const supabase = createClient();
  const { error } = await supabase.from("tenders").upsert(
    {
      bid_ntce_no: `stub-${Date.now()}`,
      bid_ntce_ord: "00",
      bid_ntce_nm: "청소 용역 (개발 스텁)",
      ntce_instt_nm: "테스트기관",
      keywords_matched: ["청소"],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "bid_ntce_no,bid_ntce_ord" }
  );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    skipped: false,
    message: "스텁 1건 저장. DATA_GO_KR_SERVICE_KEY 설정 후 실제 수집.",
    tenders: 1,
  });
}

/**
 * Vercel Cron: GET + Authorization: Bearer CRON_SECRET
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleCronFetch();
}

/**
 * 수동/외부 스케줄러: POST + x-cron-secret (또는 동일 Bearer)
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleCronFetch();
}
