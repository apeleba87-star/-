/**
 * 관리자 전용: 미분류·text_estimated 입찰에 대해 면허제한정보 API(getBidPblancListInfoLicenseLimit) 호출 → 업종/면허 파싱 → tender_industries·tender_details 갱신.
 * ?stream=1 이면 NDJSON 진행률, ?limit=N 이면 API 최대 호출 횟수 제한.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getBidPblancListInfoLicenseLimit, extractItems } from "@/lib/g2b/client";
import { parseIndustryRestrictionsFromDetailResponse } from "@/lib/g2b/industry-from-detail";
import { pickPrimaryIndustryCode, type IndustryRow } from "@/lib/g2b/industry-from-raw";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_LIMIT = 200;
const BATCH_SIZE = 20;
/** 면허제한 API 429 방지: 호출 간 대기(ms). 200건 기준 약 3분 이상 소요 */
const API_DELAY_MS = 1000;

export type DetailBackfillProgress = {
  processed: number;
  success: number;
  skipped: number;
  failed: number;
  total: number | null;
  percent: number | null;
  phase: string;
  message: string;
};

async function runDetailBackfill(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  industries: IndustryRow[],
  limit: number,
  onProgress?: (p: DetailBackfillProgress) => void
): Promise<{
  ok: boolean;
  processed: number;
  success: number;
  skipped: number;
  failed: number;
  error?: string;
  firstError?: string;
}> {
  let processed = 0;
  let success = 0;
  let skipped = 0;
  let failed = 0;
  let firstError: string | null = null;

  const { count } = await supabase
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .or("primary_industry_code.is.null,industry_match_status.eq.unclassified,industry_match_status.eq.text_estimated");
  const total = typeof count === "number" ? Math.min(count, limit) : limit;

  let from = 0;
  const now = new Date().toISOString();

  while (processed < limit) {
    const { data: tenders, error: fetchErr } = await supabase
      .from("tenders")
      .select("id, bid_ntce_no, bid_ntce_ord")
      .or("primary_industry_code.is.null,industry_match_status.eq.unclassified,industry_match_status.eq.text_estimated")
      .order("id", { ascending: true })
      .range(from, from + BATCH_SIZE - 1);

    if (fetchErr) {
      return { ok: false, processed, success, skipped, failed, error: fetchErr.message };
    }
    if (!tenders?.length) break;

    for (const t of tenders) {
      if (processed >= limit) break;
      const bidNtceNo = t.bid_ntce_no ?? "";
      const bidNtceOrd = String(t.bid_ntce_ord ?? "00").padStart(2, "0");
      if (!bidNtceNo) {
        skipped += 1;
        processed += 1;
        continue;
      }

      try {
        await new Promise((r) => setTimeout(r, API_DELAY_MS));
        const data = await getBidPblancListInfoLicenseLimit({ bidNtceNo, bidNtceOrd });
        const items = extractItems(data);
        const rawDetail = items.length > 0 ? (items[0] as Record<string, unknown>) : null;
        const fullResponse = data as unknown as Record<string, unknown>;

        const toSaveRaw = (fullResponse?.response ?? fullResponse) as Record<string, unknown> | null;
        const { error: detailUpsertErr } = await supabase.from("tender_details").upsert(
          {
            tender_id: t.id,
            raw: toSaveRaw ?? {},
            updated_at: now,
          },
          { onConflict: "tender_id" }
        );
        if (detailUpsertErr) {
          failed += 1;
          processed += 1;
          onProgress?.({
            processed,
            success,
            skipped,
            failed,
            total,
            percent: total ? Math.round((processed / total) * 100) : null,
            phase: "batch",
            message: `tender_details 저장 실패: ${t.id}`,
          });
          continue;
        }

        const parseInput = (rawDetail ?? fullResponse ?? toSaveRaw) as Record<string, unknown>;
        const matches = parseIndustryRestrictionsFromDetailResponse(parseInput, industries);

        const { error: delErr } = await supabase.from("tender_industries").delete().eq("tender_id", t.id);
        if (delErr) {
          failed += 1;
          processed += 1;
          continue;
        }

        if (matches.length > 0) {
          const insertRows = matches.map((m) => ({
            tender_id: t.id,
            industry_code: m.code,
            match_source: m.match_source,
            raw_value: m.raw_value,
          }));
          const { error: insertErr } = await supabase.from("tender_industries").insert(insertRows);
          if (insertErr) {
            failed += 1;
            processed += 1;
            continue;
          }
          const primary = pickPrimaryIndustryCode(matches.map((x) => x.code), industries);
          await supabase
            .from("tenders")
            .update({
              primary_industry_code: primary ?? null,
              industry_match_status: "matched",
              industry_name_raw: matches.slice(0, 3).map((m) => m.raw_value).join(" / "),
              industry_backfilled_at: now,
              updated_at: now,
            })
            .eq("id", t.id);
          success += 1;
        } else {
          skipped += 1;
        }
      } catch (e) {
        failed += 1;
        if (firstError == null) firstError = e instanceof Error ? e.message : String(e);
      }
      processed += 1;
    }

    from += BATCH_SIZE;
    const percent = total > 0 ? Math.round((processed / total) * 100) : null;
    onProgress?.({
      processed,
      success,
      skipped,
      failed,
      total,
      percent,
      phase: "batch",
      message: `${processed} / ${total}건 (성공 ${success}, 스킵 ${skipped}, 실패 ${failed})`,
    });
  }

  return { ok: true, processed, success, skipped, failed, firstError: firstError ?? undefined };
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const stream = url.searchParams.get("stream") === "1";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 500);

  const { data: industryRows } = await supabase
    .from("industries")
    .select("code, name, aliases, group_key, sort_order")
    .eq("is_active", true);
  const industries: IndustryRow[] = (industryRows ?? []).map((r) => ({
    code: r.code,
    name: r.name,
    aliases: r.aliases ?? undefined,
    group_key: r.group_key ?? undefined,
    sort_order: r.sort_order ?? 0,
  }));

  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (obj: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        };
        try {
          send({
            type: "progress",
            processed: 0,
            success: 0,
            skipped: 0,
            failed: 0,
            total: limit,
            percent: 0,
            phase: "start",
            message: `상세 API 백필 시작 (최대 ${limit}건)`,
          });
          const result = await runDetailBackfill(supabase, industries, limit, (p) =>
            send({
              type: "progress",
              ...p,
            })
          );
          if (result.ok) {
            revalidatePath("/tenders");
            revalidatePath("/admin/industries");
          }
          send({
            type: "complete",
            ok: result.ok,
            processed: result.processed,
            success: result.success,
            skipped: result.skipped,
            failed: result.failed,
            error: result.error,
            firstError: result.firstError,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          send({
            type: "complete",
            ok: false,
            error: message,
            processed: 0,
            success: 0,
            skipped: 0,
            failed: 0,
          });
        } finally {
          controller.close();
        }
      },
    });
    return new NextResponse(readable, {
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  const result = await runDetailBackfill(supabase, industries, limit);
  if (result.ok) {
    revalidatePath("/tenders");
    revalidatePath("/admin/industries");
  }
  const status = result.ok ? 200 : 500;
  return NextResponse.json(
    result.ok
      ? {
          ok: true,
          processed: result.processed,
          success: result.success,
          skipped: result.skipped,
          failed: result.failed,
          firstError: result.firstError,
        }
      : { ok: false, error: result.error, firstError: result.firstError, processed: result.processed, success: result.success, skipped: result.skipped, failed: result.failed },
    { status }
  );
}
