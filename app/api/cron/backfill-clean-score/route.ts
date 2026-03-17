/**
 * 기존 입찰 공고에 청소 점수(is_clean_related, clean_score, clean_reason) 백필
 * 한 번 실행해 두면 "청소 관련만" 필터에 데이터가 반영됩니다.
 */

import { NextResponse } from "next/server";
import { runBackfillCleanScore } from "@/lib/g2b/backfill-clean-score";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runBackfillCleanScore();
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, updated: result.updated, error: result.error },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, updated: result.updated });
}
