import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getKstDateString } from "@/lib/content/kst-utils";
import {
  kstCalendarMinusDays,
  pickSharedRandomPanels,
  type SharedRandomPanelKey,
} from "@/lib/report/share-unlock-panels";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "로그인 후 공유하면 1회 열람이 가능합니다." },
      { status: 401 }
    );
  }
  let body: { post_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "post_id가 필요합니다." }, { status: 400 });
  }
  const postId = body.post_id;
  if (!postId || typeof postId !== "string") {
    return NextResponse.json({ ok: false, error: "post_id가 필요합니다." }, { status: 400 });
  }
  const { data: post } = await supabase
    .from("posts")
    .select("id, source_type, slug")
    .eq("id", postId)
    .not("published_at", "is", null)
    .eq("is_private", false)
    .maybeSingle();
  const slug = (post as { slug?: string | null })?.slug ?? "";
  const isReport =
    (post as { source_type?: string | null })?.source_type != null ||
    slug.includes("daily-tender-digest") ||
    /report-/.test(slug);
  if (!post || !isReport) {
    return NextResponse.json({ ok: false, error: "해당 글이 없거나 공유 대상이 아닙니다." }, { status: 400 });
  }

  const grantDate = getKstDateString();
  const { data: existing } = await supabase
    .from("report_share_grants")
    .select("id, post_id, revealed_panel_keys")
    .eq("user_id", user.id)
    .eq("grant_date", grantDate)
    .maybeSingle();

  if (existing) {
    if (existing.post_id !== postId) {
      return NextResponse.json(
        {
          ok: false,
          error: "오늘은 이미 다른 리포트에 공유 혜택을 사용했습니다. 내일 다시 시도해 주세요.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({
      ok: true,
      message: "이미 이 리포트에서 열람 혜택이 적용되었습니다.",
      revealed_panel_keys: (existing.revealed_panel_keys as string[] | null) ?? [],
    });
  }

  const windowStart = kstCalendarMinusDays(grantDate, 7);
  const { data: recentRows } = await supabase
    .from("report_share_grants")
    .select("revealed_panel_keys")
    .eq("user_id", user.id)
    .gte("grant_date", windowStart)
    .lt("grant_date", grantDate);

  const recentUnionKeys = new Set<string>();
  for (const row of recentRows ?? []) {
    const arr = row.revealed_panel_keys as string[] | null;
    if (Array.isArray(arr)) {
      for (const k of arr) {
        if (typeof k === "string") recentUnionKeys.add(k);
      }
    }
  }

  const revealed_panel_keys: SharedRandomPanelKey[] = pickSharedRandomPanels({
    userId: user.id,
    postId,
    grantDateKst: grantDate,
    recentUnionKeys,
  });

  const { error: insertError } = await supabase.from("report_share_grants").insert({
    user_id: user.id,
    post_id: postId,
    grant_date: grantDate,
    revealed_panel_keys,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: race } = await supabase
        .from("report_share_grants")
        .select("post_id, revealed_panel_keys")
        .eq("user_id", user.id)
        .eq("grant_date", grantDate)
        .maybeSingle();
      if (race?.post_id === postId) {
        return NextResponse.json({
          ok: true,
          message: "이미 이 리포트에서 열람 혜택이 적용되었습니다.",
          revealed_panel_keys: (race.revealed_panel_keys as string[] | null) ?? [],
        });
      }
      return NextResponse.json(
        {
          ok: false,
          error: "오늘은 이미 다른 리포트에 공유 혜택을 사용했습니다. 내일 다시 시도해 주세요.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "공유가 완료되었습니다. 심화 패널이 열렸습니다.",
    revealed_panel_keys,
  });
}
