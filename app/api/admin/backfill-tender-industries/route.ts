import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  extractIndustryMatchesFromRaw,
  pickPrimaryIndustryCode,
  type IndustryRow,
} from "@/lib/g2b/industry-from-raw";
import { parseRegionSidoList } from "@/lib/tender-utils";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 100;

export type BackfillProgress = {
  processed: number;
  updated: number;
  total: number | null;
  percent: number | null;
  phase: string;
  message: string;
};

type BackfillOptions = {
  total?: number | null;
  onProgress?: (p: BackfillProgress) => void;
};

async function runBackfill(
  supabase: SupabaseClient,
  force: boolean,
  industries: IndustryRow[],
  options?: BackfillOptions
): Promise<{ ok: true; processed: number; updated: number } | { ok: false; error: string; processed: number; updated: number }> {
  const total = options?.total ?? null;
  const onProgress = options?.onProgress;
  let processed = 0;
  let updated = 0;
  let from = 0;
  const now = new Date().toISOString();

  for (;;) {
    let q = supabase
      .from("tenders")
      .select("id, bid_ntce_no, bid_ntce_ord, raw, bsns_dstr_nm, ntce_instt_nm")
      .not("raw", "is", null)
      .order("id", { ascending: true })
      .range(from, from + BATCH_SIZE - 1);
    if (!force) {
      q = q.is("primary_industry_code", null);
    }
    const { data: tenders, error: fetchErr } = await q;

    if (fetchErr) {
      return { ok: false as const, error: fetchErr.message, processed, updated };
    }
    if (!tenders?.length) break;

    const batchIds = tenders.map((t) => t.id);
    const extracted: { id: string; matchResult: ReturnType<typeof extractIndustryMatchesFromRaw> }[] = tenders.map(
      (t) => {
        const raw = t.raw as Record<string, unknown> | null;
        const matchResult = extractIndustryMatchesFromRaw(raw ?? undefined, industries);
        return { id: t.id, matchResult };
      }
    );

    const deleteRes = await supabase.from("tender_industries").delete().in("tender_id", batchIds);
    if (deleteRes.error) {
      return { ok: false as const, error: deleteRes.error.message, processed, updated };
    }
    const insertRows: { tender_id: string; industry_code: string; match_source: string; raw_value: string }[] = [];
    for (const { id, matchResult } of extracted) {
      for (const m of matchResult.matches) {
        insertRows.push({
          tender_id: id,
          industry_code: m.code,
          match_source: m.match_source,
          raw_value: m.raw_value,
        });
      }
    }
    if (insertRows.length > 0) {
      const insertRes = await supabase.from("tender_industries").insert(insertRows);
      if (insertRes.error) {
        return { ok: false as const, error: insertRes.error.message, processed, updated };
      }
    }

    for (const t of tenders) {
      const ex = extracted.find((e) => e.id === t.id);
      const matchResult = ex?.matchResult;
      const codes = matchResult?.matches.map((m) => m.code) ?? [];
      const primary = pickPrimaryIndustryCode(codes, industries);
      const regionText = [t.bsns_dstr_nm, t.ntce_instt_nm].filter(Boolean).join(" ");
      const region_sido_list = parseRegionSidoList(regionText || undefined);
      const { error: updateErr } = await supabase
        .from("tenders")
        .update({
          primary_industry_code: primary ?? null,
          industry_match_status: matchResult?.match_status ?? null,
          industry_name_raw: matchResult?.raw_values?.length ? matchResult.raw_values.slice(0, 3).join(" / ") : null,
          region_sido_list: region_sido_list.length > 0 ? region_sido_list : [],
          industry_backfilled_at: now,
          updated_at: now,
        })
        .eq("id", t.id);
      if (updateErr) {
        return { ok: false as const, error: updateErr.message, processed, updated };
      }
      if (codes.length > 0) updated += 1;
    }

    processed += tenders.length;
    from += BATCH_SIZE;

    const percent = total != null && total > 0 ? Math.round((processed / total) * 100) : null;
    onProgress?.({
      processed,
      updated,
      total,
      percent,
      phase: "batch",
      message: total != null ? `${processed} / ${total}건 처리 (${percent}%) · 업종 매핑 ${updated}건` : `배치 처리 중… ${processed}건 완료 (업종 매핑 ${updated}건)`,
    });
  }

  return { ok: true as const, processed, updated };
}

/**
 * 관리자 전용: 기존 tenders의 raw에서 업종 추출 → tender_industries + primary_industry_code 반영.
 * ?force=true 이면 전량 재계산, 기본은 primary_industry_code IS NULL 인 행만 처리.
 * ?stream=1 이면 NDJSON 스트리밍으로 진행률 실시간 전달.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
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
  const force = url.searchParams.get("force") === "true";
  const stream = url.searchParams.get("stream") === "1";

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
        let total: number | null = null;
        try {
          const countQ = supabase
            .from("tenders")
            .select("id", { count: "exact", head: true })
            .not("raw", "is", null);
          const countQuery = force ? countQ : countQ.is("primary_industry_code", null);
          const { count } = await countQuery;
          total = typeof count === "number" ? count : null;
          send({
            type: "progress",
            processed: 0,
            updated: 0,
            total,
            percent: 0,
            phase: "start",
            message: total != null ? `총 ${total}건 확인. 배치 처리 시작…` : "배치 처리 시작…",
          });

          const result = await runBackfill(supabase, force, industries, {
            total,
            onProgress: (p) =>
              send({
                type: "progress",
                processed: p.processed,
                updated: p.updated,
                total: p.total,
                percent: p.percent,
                phase: p.phase,
                message: p.message,
              }),
          });

          if (result.ok) {
            revalidatePath("/tenders");
            revalidatePath("/admin/industries");
          }
          send({
            type: "complete",
            ok: result.ok,
            processed: result.processed,
            updated: result.updated,
            error: result.ok ? undefined : result.error,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          send({ type: "complete", ok: false, error: message, processed: 0, updated: 0 });
        } finally {
          controller.close();
        }
      },
    });
    return new NextResponse(readable, {
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  const result = await runBackfill(supabase, force, industries);
  if (result.ok) {
    revalidatePath("/tenders");
    revalidatePath("/admin/industries");
  }
  const status = result.ok ? 200 : 500;
  return NextResponse.json(
    result.ok ? { ok: true, processed: result.processed, updated: result.updated } : { ok: false, error: result.error, processed: result.processed, updated: result.updated },
    { status }
  );
}
