/**
 * 관리자 수동: 낙찰 리포트 스냅샷 생성
 * POST ?force=true(선택) — 동일 period_key 이미 성공이면 기본 건너뜀
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { GENERATOR_VERSION } from "@/lib/content/content-generation-runs";
import { buildAwardMarketSnapshot } from "@/lib/content/build-award-market-snapshot";
import { reportContentToMarkdown } from "@/lib/content/snapshot-to-post-body";

export const dynamic = "force-dynamic";

const RUN_TYPE = "award_market_digest";
const KST = "Asia/Seoul";

function kstDateKey(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await createServerSupabase();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin" && profile?.role !== "editor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url ?? "", "http://localhost");
    const force = url.searchParams.get("force") === "true";
    const runKey = `award:${kstDateKey(new Date())}`;
    const supabase = createServiceSupabase();

    const { data: existingRun } = await supabase
      .from("content_generation_runs")
      .select("id, status, attempt_count")
      .eq("run_type", RUN_TYPE)
      .eq("run_key", runKey)
      .maybeSingle();

    if (existingRun?.status === "success" && !force) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "already_success",
        message: "오늘 회차 낙찰 리포트는 이미 생성되었습니다. 재생성 체크 후 다시 실행하세요.",
      });
    }

    const attemptCount = (existingRun?.attempt_count ?? 0) + 1;
    const upsertRun = await supabase
      .from("content_generation_runs")
      .upsert(
        {
          run_type: RUN_TYPE,
          run_key: runKey,
          status: "pending",
          started_at: new Date().toISOString(),
          attempt_count: attemptCount,
          generator_version: GENERATOR_VERSION,
        },
        { onConflict: "run_type,run_key", ignoreDuplicates: false }
      )
      .select("id")
      .single();
    const runId = upsertRun.data?.id ?? existingRun?.id ?? null;

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error: rowsError } = await supabase
      .from("tender_award_summaries")
      .select("tender_id,bid_ntce_nm,openg_dt,bid_rate_pct,prtcpt_cnum,sucsfbid_amt,presmpt_prce,rate_band")
      .gte("openg_dt", since)
      .order("openg_dt", { ascending: false })
      .limit(12000);

    if (rowsError) {
      await supabase
        .from("content_generation_runs")
        .update({ status: "failed", error_message: rowsError.message, finished_at: new Date().toISOString() })
        .eq("run_type", RUN_TYPE)
        .eq("run_key", runKey);
      return NextResponse.json({ ok: false, error: rowsError.message }, { status: 500 });
    }

    const tenderIds = [...new Set((rows ?? []).map((r) => r.tender_id).filter((v): v is string => typeof v === "string" && v.length > 0))];
    const [{ data: tRows }, { data: tiRows }, { data: industryRows }] = await Promise.all([
      tenderIds.length
        ? supabase
            .from("tenders")
            .select("id,region_sido_list,ntce_instt_nm,base_amt")
            .in("id", tenderIds)
        : Promise.resolve({ data: [] as unknown[] }),
      tenderIds.length
        ? supabase
            .from("tender_industries")
            .select("tender_id,industry_code")
            .in("tender_id", tenderIds)
        : Promise.resolve({ data: [] as unknown[] }),
      supabase.from("industries").select("code,name,is_active").eq("is_active", true),
    ]);

    const tendersById = new Map(
      ((tRows ?? []) as { id: string; region_sido_list: string[] | null; ntce_instt_nm: string | null; base_amt: number | null }[]).map((t) => [
        t.id,
        t,
      ])
    );
    const industryNameByCode = new Map(
      ((industryRows ?? []) as { code: string; name: string }[]).map((i) => [i.code, i.name])
    );
    const industryCodesByTender = new Map<string, string[]>();
    for (const row of (tiRows ?? []) as { tender_id: string; industry_code: string }[]) {
      const list = industryCodesByTender.get(row.tender_id) ?? [];
      if (!list.includes(row.industry_code)) list.push(row.industry_code);
      industryCodesByTender.set(row.tender_id, list);
    }

    const enrichedRows = (rows ?? []).map((r) => {
      const tender = r.tender_id ? tendersById.get(r.tender_id) : undefined;
      const codes = r.tender_id ? industryCodesByTender.get(r.tender_id) ?? [] : [];
      const pickedCode = codes.find((c) => industryNameByCode.has(c)) ?? codes[0] ?? null;
      const region =
        Array.isArray(tender?.region_sido_list) && tender!.region_sido_list.length > 0 ? tender!.region_sido_list[0]! : null;
      return {
        ...r,
        industry_code: pickedCode,
        industry_name: pickedCode ? industryNameByCode.get(pickedCode) ?? pickedCode : null,
        region_sido: region,
        agency_name: tender?.ntce_instt_nm ?? null,
        base_amt: tender?.base_amt ?? null,
      };
    });

    const snapshot = buildAwardMarketSnapshot(enrichedRows as Parameters<typeof buildAwardMarketSnapshot>[0], new Date());
    if (!snapshot) {
      await supabase
        .from("content_generation_runs")
        .update({
          status: "skipped",
          source_count: 0,
          error_message: null,
          finished_at: new Date().toISOString(),
        })
        .eq("run_type", RUN_TYPE)
        .eq("run_key", runKey);
      return NextResponse.json({ ok: true, skipped: true, reason: "no_awards", message: "집계할 낙찰 데이터가 없습니다." });
    }

    const { error: upsertSnapshotError } = await supabase.from("report_snapshots").upsert(
      {
        run_id: runId,
        report_type: snapshot.report_type,
        period_key: snapshot.period_key,
        title: snapshot.title,
        content_full: snapshot.content_full as Record<string, unknown>,
        content_summary: snapshot.content_summary as Record<string, unknown>,
        content_social: snapshot.content_social,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "report_type,period_key" }
    );

    if (upsertSnapshotError) {
      await supabase
        .from("content_generation_runs")
        .update({
          status: "failed",
          source_count: snapshot.sample_count,
          error_message: upsertSnapshotError.message,
          finished_at: new Date().toISOString(),
        })
        .eq("run_type", RUN_TYPE)
        .eq("run_key", runKey);
      return NextResponse.json({ ok: false, error: upsertSnapshotError.message }, { status: 500 });
    }

    const shouldPublish = process.env.CONTENT_AUTO_PUBLISH === "true";
    const postSlug = `report-${snapshot.report_type.replace(/_/g, "-")}-${snapshot.period_key.replace(/\s/g, "-")}`;
    const postExcerpt =
      (snapshot.content_summary.headline as string | undefined) ??
      (snapshot.content_full.headline as string | undefined) ??
      snapshot.title;
    const postBody = reportContentToMarkdown(snapshot.content_full);

    const { data: existingPost } = await supabase
      .from("posts")
      .select("id,published_at")
      .eq("source_type", snapshot.report_type)
      .eq("source_ref", snapshot.period_key)
      .maybeSingle();

    const postPayload = {
      title: snapshot.title,
      slug: postSlug,
      body: postBody,
      excerpt: postExcerpt,
      report_snapshot: snapshot.content_full as Record<string, unknown>,
      source_type: snapshot.report_type,
      source_ref: snapshot.period_key,
      published_at: shouldPublish ? new Date().toISOString() : (existingPost?.published_at ?? null),
      newsletter_include: false,
      updated_at: new Date().toISOString(),
    };

    let generatedPostId: string | null = null;
    if (existingPost?.id) {
      const { error: updatePostError } = await supabase.from("posts").update(postPayload).eq("id", existingPost.id);
      if (updatePostError) {
        await supabase
          .from("content_generation_runs")
          .update({
            status: "failed",
            source_count: snapshot.sample_count,
            error_message: updatePostError.message,
            finished_at: new Date().toISOString(),
          })
          .eq("run_type", RUN_TYPE)
          .eq("run_key", runKey);
        return NextResponse.json({ ok: false, error: updatePostError.message }, { status: 500 });
      }
      generatedPostId = existingPost.id;
    } else {
      const { data: insertedPost, error: insertPostError } = await supabase
        .from("posts")
        .insert({
          ...postPayload,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insertPostError || !insertedPost) {
        await supabase
          .from("content_generation_runs")
          .update({
            status: "failed",
            source_count: snapshot.sample_count,
            error_message: insertPostError?.message ?? "post insert failed",
            finished_at: new Date().toISOString(),
          })
          .eq("run_type", RUN_TYPE)
          .eq("run_key", runKey);
        return NextResponse.json({ ok: false, error: insertPostError?.message ?? "post insert failed" }, { status: 500 });
      }
      generatedPostId = insertedPost.id;
    }

    await supabase
      .from("report_snapshots")
      .update({ published_post_id: generatedPostId, updated_at: new Date().toISOString() })
      .eq("report_type", snapshot.report_type)
      .eq("period_key", snapshot.period_key);

    await supabase
      .from("content_generation_runs")
      .update({
        status: "success",
        source_count: snapshot.sample_count,
        generated_post_id: generatedPostId,
        payload: {
          report_type: snapshot.report_type,
          period_key: snapshot.period_key,
          title: snapshot.title,
        },
        error_message: null,
        finished_at: new Date().toISOString(),
      })
      .eq("run_type", RUN_TYPE)
      .eq("run_key", runKey);

    return NextResponse.json({
      ok: true,
      skipped: false,
      run_key: runKey,
      report_type: snapshot.report_type,
      period_key: snapshot.period_key,
      post_id: generatedPostId,
      message: shouldPublish
        ? "낙찰 리포트가 생성·공개되었습니다. 낙찰 리포트 탭에서 확인하세요."
        : "낙찰 리포트 초안이 생성되었습니다. 관리자 글 관리에서 발행 후 노출됩니다.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

