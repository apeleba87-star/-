import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { createServiceSupabase } from "@/lib/supabase-server";
import { getTenderKeywordOptionsByCategory } from "@/lib/g2b/keywords";
import { DATA_GO_KR_SCSBID_SERVICE_KEY_ENV } from "@/lib/g2b/scsbid-client";
import { runScsbidAwardRawIngest } from "@/lib/g2b/scsbid-award-ingest";
import { getScsbidAwardDefaultLookbackMinutes } from "@/lib/g2b/scsbid-ingest-window";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function parsePositiveInt(v: string | null, fallback: number): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!process.env.DATA_GO_KR_SCSBID_SERVICE_KEY?.trim()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `${DATA_GO_KR_SCSBID_SERVICE_KEY_ENV} 미설정`,
    });
  }

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const url = req.nextUrl;
  const maxRows = parsePositiveInt(
    url.searchParams.get("maxRows"),
    parsePositiveInt(process.env.SCSBID_AWARD_INGEST_MAX_ROWS_PER_RUN ?? null, 2500)
  );
  const pageSize = Math.min(999, parsePositiveInt(url.searchParams.get("pageSize"), 100));
  const lookbackMinutes = parsePositiveInt(
    url.searchParams.get("lookbackMinutes"),
    getScsbidAwardDefaultLookbackMinutes()
  );

  const optionsByCategory = await getTenderKeywordOptionsByCategory();
  const result = await runScsbidAwardRawIngest({
    supabase,
    optionsByCategory,
    lookbackMinutes,
    pageSize,
    maxRowsPerRun: maxRows,
  });

  return NextResponse.json({
    ok: result.ok,
    skipped: false,
    scsbid: {
      pages: result.pages,
      rowsWritten: result.rowsWritten,
      totalCount: result.totalCount,
      lastResultCode: result.lastResultCode,
      inqryBgnDt: result.inqryBgnDt,
      inqryEndDt: result.inqryEndDt,
      error: result.error,
    },
    lookbackMinutes,
  });
}

/**
 * 용역 낙찰 원천 수집 → tender_award_raw. Vercel Cron: GET/POST + CRON_SECRET
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handle(req);
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handle(req);
}
