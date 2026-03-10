import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";

/** 마감 공고 보관 기간(월). 이 기간이 지난 마감 공고는 삭제 대상. */
const CLOSED_TENDER_RETENTION_MONTHS = 3;

/**
 * 마감된 입찰 공고 중 보관 기간(3개월)이 지난 건을 삭제.
 * tenders 삭제 시 ON DELETE CASCADE로 tender_details, tender_regions, tender_licenses, tender_changes, user_saved_tenders 함께 삭제됨.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabase();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - CLOSED_TENDER_RETENTION_MONTHS);
  const cutoffIso = cutoff.toISOString();

  const { data: toDelete, error: selectError } = await supabase
    .from("tenders")
    .select("id")
    .not("bid_clse_dt", "is", null)
    .lt("bid_clse_dt", cutoffIso);

  if (selectError) {
    return NextResponse.json(
      { ok: false, error: selectError.message },
      { status: 500 }
    );
  }

  const ids = (toDelete ?? []).map((r) => r.id);
  if (ids.length === 0) {
    return NextResponse.json({
      ok: true,
      deleted: 0,
      message: "삭제할 마감 공고 없음",
    });
  }

  const { error: deleteError } = await supabase
    .from("tenders")
    .delete()
    .in("id", ids);

  if (deleteError) {
    return NextResponse.json(
      { ok: false, error: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    deleted: ids.length,
    cutoff: cutoffIso,
    message: `마감 후 ${CLOSED_TENDER_RETENTION_MONTHS}개월 지난 공고 ${ids.length}건 삭제됨`,
  });
}
