import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { createServiceSupabase } from "@/lib/supabase-server";
import { runDemandRtmsIngestJob } from "@/lib/demand/rtms-ingest";

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
    const supabase = createServiceSupabase();
    const result = await runDemandRtmsIngestJob(supabase);
    if (!result.ok) {
      return NextResponse.json(result, { status: result.needsKey ? 400 : 500 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
