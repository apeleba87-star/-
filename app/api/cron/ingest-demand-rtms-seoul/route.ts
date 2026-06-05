import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { revalidateDemandHub } from "@/lib/demand/revalidate-hub";
import {
  pickRotatingDemandCityId,
  runDemandRtmsIngestJob,
} from "@/lib/demand/rtms-ingest";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return handleRtmsIngest(req);
}

export async function POST(req: NextRequest) {
  return handleRtmsIngest(req);
}

async function handleRtmsIngest(req: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cityId =
      req.nextUrl.searchParams.get("cityId")?.trim() ||
      pickRotatingDemandCityId();
    const supabase = createServiceSupabase();
    const result = await runDemandRtmsIngestJob(supabase, {
      cityId,
      refreshNational: true,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: result.needsKey ? 400 : 500 });
    }
    revalidateDemandHub();
    return NextResponse.json({ ...result, rotatedCityId: cityId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
