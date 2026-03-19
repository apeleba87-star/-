import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { getKstDateString } from "@/lib/content/kst-utils";
import { sendEmail, subscriptionExpiringTomorrowEmailBody } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

/** 취소 예정 구독 중 내일(next_billing_at) 이용 종료되는 사용자에게 리마인더 이메일 발송 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!CRON_SECRET || bearer !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowYmd = getKstDateString(tomorrow);

  const supabase = createServiceSupabase();
  const { data: subs, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, user_id")
    .eq("status", "cancelled")
    .eq("next_billing_at", tomorrowYmd);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!subs?.length) {
    return NextResponse.json({ sent: 0, message: "대상 없음" });
  }

  const userIds = [...new Set((subs as { user_id: string }[]).map((s) => s.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", userIds);
  const emailByUserId = new Map(
    (profiles ?? []).map((p) => [p.id, (p as { email?: string | null }).email])
  );

  let sent = 0;
  for (const sub of subs as { user_id: string }[]) {
    const email = emailByUserId.get(sub.user_id);
    if (!email?.trim()) continue;
    const result = await sendEmail({
      to: email,
      subject: "[클린아이덱스] 구독 이용이 내일 종료됩니다",
      html: subscriptionExpiringTomorrowEmailBody(),
    });
    if (result.ok) sent++;
  }

  return NextResponse.json({ sent, total: subs.length });
}
