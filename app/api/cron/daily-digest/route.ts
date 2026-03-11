import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * @deprecated Use POST /api/cron/generate-content?type=daily instead.
 * 이 엔드포인트는 queue에 제목만 넣고 post를 만들지 않습니다.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { count: tendersCount } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .gte("bid_ntce_dt", today)
    .lt("bid_ntce_dt", today + "T23:59:59.999Z");

  const title = `오늘 나라장터 입찰 공고 ${tendersCount ?? 0}건`;
  await supabase.from("newsletter_queue").insert({
    type: "auto",
    title,
    summary: `${today} 기준 수집 데이터 요약`,
    scheduled_for: today,
    sort_order: 0,
  });

  return NextResponse.json({ ok: true, title, count: tendersCount ?? 0 });
}
