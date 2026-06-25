import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { processDemandRtmsDealIngestJobs } from "@/lib/demand/rtms-deal-ingest-jobs";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return handleProcess(req);
}

export async function POST(req: NextRequest) {
  return handleProcess(req);
}

function readNumberParam(req: NextRequest, name: string): number | undefined {
  const value = Number(req.nextUrl.searchParams.get(name));
  return Number.isFinite(value) ? value : undefined;
}

async function handleProcess(req: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDemandRtmsDealIngestJobs(createServiceSupabase(), {
    maxJobs: readNumberParam(req, "maxJobs"),
    staleMinutes: readNumberParam(req, "staleMinutes"),
    maxAttempts: readNumberParam(req, "maxAttempts"),
    maxRuntimeMs: readNumberParam(req, "maxRuntimeMs"),
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
