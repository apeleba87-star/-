import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { runDemandKeywordIngestJob } from "@/lib/demand/keyword-ingest";
import { revalidateDemandHub } from "@/lib/demand/revalidate-hub";
import { pickRotatingDemandCityId } from "@/lib/demand/rtms-ingest";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
/** 시·도 1곳×구별×2키워드×(일+월) DataLab — 17일 주기로 전국 280구 커버 */
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
    const cityId =
      req.nextUrl.searchParams.get("cityId")?.trim() || pickRotatingDemandCityId();
    const supabase = createServiceSupabase();
    const result = await runDemandKeywordIngestJob(supabase, { cityId });
    if (result.ok || result.datalab.ok) {
      revalidateDemandHub();
    }
    const status = result.ok ? 200 : result.datalab.ok ? 200 : 500;
    return NextResponse.json({ ...result, rotatedCityId: cityId }, { status });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
