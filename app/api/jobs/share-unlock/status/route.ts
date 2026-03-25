import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getKstTodayString } from "@/lib/jobs/kst-date";
import { getFreeWageInsightByJobTypeKey, hasPremiumAccess } from "@/lib/jobs/wage-insight";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { jobTypeKey?: string } | null;
  const jobTypeKey = (body?.jobTypeKey ?? "").trim();
  if (!jobTypeKey) return NextResponse.json({ ok: false, error: "jobTypeKey가 필요합니다." }, { status: 400 });

  const [isPaid, free, unlockRes] = await Promise.all([
    hasPremiumAccess(supabase, user.id),
    getFreeWageInsightByJobTypeKey(supabase, jobTypeKey),
    supabase
      .from("daily_share_unlocks")
      .select("shared_at, used_at, unlock_granted")
      .eq("user_id", user.id)
      .eq("date_kst", getKstTodayString())
      .maybeSingle(),
  ]);

  const unlock = unlockRes.data ?? null;
  return NextResponse.json({
    ok: true,
    isPaid,
    free,
    unlock: {
      todayShared: Boolean(unlock?.shared_at),
      todayUsed: Boolean(unlock?.used_at),
      canOpenDetailedOnce: !!unlock?.unlock_granted && !unlock?.used_at,
    },
  });
}

