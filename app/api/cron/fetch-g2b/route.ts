import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { runTenderFetch } from "@/lib/g2b/fetch-tenders";

export const dynamic = "force-dynamic";

/**
 * 나라장터(G2B) 입찰공고 수집
 * - DATA_GO_KR_SERVICE_KEY 있으면: 공공데이터포털 API 호출 → tenders upsert
 * - 없으면: 스텁 1건 insert (개발용)
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.DATA_GO_KR_SERVICE_KEY) {
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
  return NextResponse.json({ ok: true, message: "스텁 1건 저장. DATA_GO_KR_SERVICE_KEY 설정 후 실제 수집.", tenders: 1 });
}
