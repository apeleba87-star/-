import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { runDemandKeywordIngestJob } from "@/lib/demand/keyword-ingest";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
/** 25구×2키워드×(일+월) DataLab 배치 — 120초면 구별 수집 전에 끊길 수 있음 */
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return handleIngest(req);
}

export async function POST(req: NextRequest) {
  return handleIngest(req);
}

async function handleIngest(req: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceSupabase();
    const result = await runDemandKeywordIngestJob(supabase);
    const status = result.ok ? 200 : result.datalab.ok ? 200 : 500;
    return NextResponse.json(result, { status });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
