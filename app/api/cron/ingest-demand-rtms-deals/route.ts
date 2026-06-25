import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { pickRotatingDemandCityId } from "@/lib/demand/rtms-ingest";
import { runDemandRtmsDealsIngestJob } from "@/lib/demand/rtms-deals-ingest";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return handleRtmsDealsIngest(req);
}

export async function POST(req: NextRequest) {
  return handleRtmsDealsIngest(req);
}

async function handleRtmsDealsIngest(req: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cityId = req.nextUrl.searchParams.get("cityId")?.trim() || pickRotatingDemandCityId();
    const monthsBackRaw = Number(req.nextUrl.searchParams.get("monthsBack") ?? process.env.DEMAND_RTMS_DEALS_MONTHS_BACK ?? 3);
    const monthsBack = Number.isFinite(monthsBackRaw) ? Math.round(monthsBackRaw) : 3;
    const result = await runDemandRtmsDealsIngestJob(createServiceSupabase(), {
      cityId,
      monthsBack,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: result.needsKey ? 400 : 500 });
    }
    return NextResponse.json({ ...result, rotatedCityId: cityId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
