import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { createServiceSupabase } from "@/lib/supabase-server";
import { runSeoulOpenApiGetJobInfoIngest } from "@/lib/jobs-public-ingest/run-seoul-openapi-ingest";
import type { SeoulResponseFormat } from "@/lib/jobs-public-ingest/seoul/fetch-get-job-info";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function parsePositiveInt(v: string | null, fallback: number): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const seoulKey = process.env.SEOUL_OPEN_API_KEY?.trim();
  if (!seoulKey) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "SEOUL_OPEN_API_KEY 미설정",
      sources: [],
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
    parsePositiveInt(process.env.PUBLIC_JOB_INGEST_MAX_ROWS_PER_RUN ?? null, 2500)
  );
  const pageSize = Math.min(1000, parsePositiveInt(url.searchParams.get("pageSize"), 500));
  const baseUrl = process.env.SEOUL_OPEN_API_BASE_URL?.trim() || undefined;
  const formatParam = url.searchParams.get("format");
  const responseFormat: SeoulResponseFormat =
    formatParam === "json" ? "json" : "xml";

  const seoul = await runSeoulOpenApiGetJobInfoIngest({
    supabase,
    apiKey: seoulKey,
    baseUrl,
    responseFormat,
    pageSize,
    maxRowsPerRun: maxRows,
  });

  return NextResponse.json({
    ok: seoul.ok,
    skipped: false,
    seoul: {
      pages: seoul.pages,
      rowsWritten: seoul.rowsWritten,
      listTotalCount: seoul.listTotalCount,
      lastResultCode: seoul.lastResultCode,
      error: seoul.error,
    },
  });
}

/**
 * 공공 일자리 원천 수집 → `job_open_data_raw`. 정규화는 별도 단계.
 * Vercel Cron: GET + Authorization: Bearer CRON_SECRET
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
