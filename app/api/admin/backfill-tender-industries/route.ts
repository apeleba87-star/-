import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { runBackfillTenderIndustries } from "@/lib/g2b/backfill-tender-industries";
import type { IndustryRow } from "@/lib/g2b/industry-from-raw";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 관리자 전용: 기존 tenders의 raw에서 업종 추출 → tender_industries + primary_industry_code 반영.
 * ?force=true 이면 전량 재계산, 기본은 primary_industry_code IS NULL 인 행만 처리.
 * ?stream=1 이면 NDJSON 스트리밍으로 진행률 실시간 전달.
 */
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

          const result = await runBackfillTenderIndustries(supabase, industries, {
            force,
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

  const result = await runBackfillTenderIndustries(supabase, industries, { force });
  if (result.ok) {
    revalidatePath("/tenders");
    revalidatePath("/admin/industries");
  }
  const status = result.ok ? 200 : 500;
  return NextResponse.json(
    result.ok
      ? { ok: true, processed: result.processed, updated: result.updated }
      : { ok: false, error: result.error, processed: result.processed, updated: result.updated },
    { status },
  );
}
