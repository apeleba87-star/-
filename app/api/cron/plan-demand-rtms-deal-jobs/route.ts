import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { createDemandRtmsDealIngestJobs } from "@/lib/demand/rtms-deal-ingest-jobs";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return handlePlan(req);
}

export async function POST(req: NextRequest) {
  return handlePlan(req);
}

async function handlePlan(req: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monthsBackRaw = Number(req.nextUrl.searchParams.get("monthsBack") ?? process.env.DEMAND_RTMS_DEALS_MONTHS_BACK ?? 2);
  const monthsBack = Number.isFinite(monthsBackRaw) ? Math.round(monthsBackRaw) : 2;
  const cityId = req.nextUrl.searchParams.get("cityId")?.trim() || undefined;
  const districtSlugs = req.nextUrl.searchParams
    .get("districtSlugs")
    ?.split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);

  const result = await createDemandRtmsDealIngestJobs(createServiceSupabase(), {
    monthsBack,
    cityId,
    districtSlugs: districtSlugs?.length ? districtSlugs : undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
