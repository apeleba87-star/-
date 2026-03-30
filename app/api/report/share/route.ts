import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getKstDateString } from "@/lib/content/kst-utils";
import {
  kstCalendarMinusDays,
  pickSharedRandomPanels,
  type SharedRandomPanelKey,
} from "@/lib/report/share-unlock-panels";
import type { JobWageDailyReportPayload } from "@/lib/jobs/job-wage-daily-report";
import { provincesFromPayload } from "@/lib/jobs/job-wage-report-display";

type Body = { post_id?: string; job_wage_report_date?: string };

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isUsableJobWagePayload(p: unknown): p is JobWageDailyReportPayload {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.methodologyNote === "string" &&
    typeof o.reportDateKst === "string" &&
    (Array.isArray(o.provinces) || Array.isArray(o.regions))
  );
}

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

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const postId = typeof body.post_id === "string" ? body.post_id.trim() : "";
  const jobWageDate = typeof body.job_wage_report_date === "string" ? body.job_wage_report_date.trim() : "";

  if ((postId && jobWageDate) || (!postId && !jobWageDate)) {
    return NextResponse.json(
      { ok: false, error: "post_id 또는 job_wage_report_date 중 하나만 보내 주세요." },
      { status: 400 }
    );
  }

  let seedPostIdForPanels: string;

  if (jobWageDate) {
    if (!isYmd(jobWageDate)) {
      return NextResponse.json({ ok: false, error: "job_wage_report_date 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const { data: wageRow } = await supabase
      .from("job_wage_daily_reports")
      .select("payload")
      .eq("report_date", jobWageDate)
      .maybeSingle();
    const payload = wageRow?.payload;
    if (!isUsableJobWagePayload(payload) || provincesFromPayload(payload).length === 0) {
      return NextResponse.json(
        { ok: false, error: "해당 일자 일당 리포트를 찾을 수 없습니다." },
        { status: 400 }
      );
    }
    seedPostIdForPanels = `job-wage-report:${jobWageDate}`;
  } else {
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
    seedPostIdForPanels = postId;
  }

  const grantDate = getKstDateString();
  const { data: existing } = await supabase
    .from("report_share_grants")
    .select("id, post_id, revealed_panel_keys")
    .eq("user_id", user.id)
    .eq("grant_date", grantDate)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      message: "오늘 공유로 열람이 적용된 상태입니다. 입찰·일당 리포트 심화 영역에 동일하게 적용됩니다.",
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
    postId: seedPostIdForPanels,
    grantDateKst: grantDate,
    recentUnionKeys,
  });

  const { error: insertError } = await supabase.from("report_share_grants").insert({
    user_id: user.id,
    post_id: jobWageDate ? null : postId,
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
      if (race) {
        return NextResponse.json({
          ok: true,
          message: "오늘 공유로 열람이 적용된 상태입니다. 입찰·일당 리포트 심화 영역에 동일하게 적용됩니다.",
          revealed_panel_keys: (race.revealed_panel_keys as string[] | null) ?? [],
        });
      }
    }
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: jobWageDate
      ? "공유가 완료되었습니다. 일당 리포트 심화 인사이트가 열렸습니다."
      : "공유가 완료되었습니다. 심화 패널이 열렸습니다.",
    revealed_panel_keys,
  });
}
