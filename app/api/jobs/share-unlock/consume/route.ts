import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getKstTodayString } from "@/lib/jobs/kst-date";
import { getDetailedWageInsightByJobTypeKey, hasPremiumAccess } from "@/lib/jobs/wage-insight";
import { extractRequestMeta, writeShareUnlockLog } from "@/lib/jobs/share-unlock-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    jobTypeKey?: string;
    region?: string;
    skillLevel?: "expert" | "general";
    payAmount?: number;
  } | null;
  const jobTypeKey = (body?.jobTypeKey ?? "").trim();
  const region = (body?.region ?? "").trim();
  const skillLevel = body?.skillLevel === "expert" ? "expert" : "general";
  const payAmount = Number(body?.payAmount ?? 0);
  if (!jobTypeKey || !region || payAmount <= 0) {
    return NextResponse.json({ ok: false, error: "상세 패널 열기 입력값이 부족합니다." }, { status: 400 });
  }

  const isPaid = await hasPremiumAccess(supabase, user.id);
  const today = getKstTodayString();
  const meta = extractRequestMeta(req);
  if (!isPaid) {
    const { data: unlock } = await supabase
      .from("daily_share_unlocks")
      .select("id, unlock_granted, used_at")
      .eq("user_id", user.id)
      .eq("date_kst", today)
      .maybeSingle();
    if (!unlock?.unlock_granted || unlock.used_at) {
      await writeShareUnlockLog({
        supabase,
        userId: user.id,
        dateKst: today,
        action: "consume_blocked",
        channel: meta.channel,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
        detail: { reason: "no_unlock_or_used", jobTypeKey, region, skillLevel, payAmount },
      });
      return NextResponse.json({ ok: false, error: "오늘 상세 패널 열람권이 없습니다." }, { status: 403 });
    }
    const { error } = await supabase
      .from("daily_share_unlocks")
      .update({ used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", unlock.id)
      .is("used_at", null);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const detailed = await getDetailedWageInsightByJobTypeKey({
    supabase,
    jobTypeKey,
    region,
    skillLevel,
    currentPayAmount: payAmount,
  });
  await writeShareUnlockLog({
    supabase,
    userId: user.id,
    dateKst: today,
    action: "consume",
    channel: meta.channel,
    ipHash: meta.ipHash,
    userAgent: meta.userAgent,
    detail: { isPaid, jobTypeKey, region, skillLevel, payAmount },
  });
  return NextResponse.json({ ok: true, detailed });
}

