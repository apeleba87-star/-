import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getKstTodayString } from "@/lib/jobs/kst-date";
import { hasPremiumAccess } from "@/lib/jobs/wage-insight";
import { extractRequestMeta, writeShareUnlockLog } from "@/lib/jobs/share-unlock-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const isPaid = await hasPremiumAccess(supabase, user.id);
  if (isPaid) return NextResponse.json({ ok: true, isPaid, bypass: true });

  const nowIso = new Date().toISOString();
  const today = getKstTodayString();
  const meta = extractRequestMeta(req);
  const { error } = await supabase.from("daily_share_unlocks").upsert(
    {
      user_id: user.id,
      date_kst: today,
      shared_at: nowIso,
      unlock_granted: true,
      updated_at: nowIso,
    },
    { onConflict: "user_id,date_kst" }
  );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  await writeShareUnlockLog({
    supabase,
    userId: user.id,
    dateKst: today,
    action: "grant",
    channel: meta.channel,
    ipHash: meta.ipHash,
    userAgent: meta.userAgent,
    detail: { granted: true },
  });

  return NextResponse.json({ ok: true, granted: true });
}

