import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { getKstTodayString } from "@/lib/jobs/kst-date";

/**
 * 작업일(work_date)이 지난 구인글을 자동으로 마감(closed) 처리.
 * KST 기준 오늘보다 이전인 work_date를 가진 open 글을 closed로 변경.
 * 매일 1회 크론으로 호출 권장.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabase();
  const todayKst = getKstTodayString();

  const { data: toClose, error: selectError } = await supabase
    .from("job_posts")
    .select("id")
    .eq("status", "open")
    .not("work_date", "is", null)
    .lt("work_date", todayKst);

  if (selectError) {
    return NextResponse.json(
      { ok: false, error: selectError.message },
      { status: 500 }
    );
  }

  const ids = (toClose ?? []).map((r) => r.id);
  if (ids.length === 0) {
    return NextResponse.json({
      ok: true,
      closed: 0,
      message: "마감 처리할 구인글 없음",
    });
  }

  const { error: updateError } = await supabase
    .from("job_posts")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    closed: ids.length,
    message: `작업일 지난 구인글 ${ids.length}건 마감 처리됨 (기준일 KST ${todayKst})`,
  });
}
