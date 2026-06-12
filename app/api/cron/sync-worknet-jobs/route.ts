import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { createServiceSupabase } from "@/lib/supabase-server";
import { computeJobSpotlightSnapshots } from "@/lib/jobs-public-ingest/compute-job-spotlight-snapshots";
import { closeWorknetOpeningsMissingFreshRaw } from "@/lib/jobs-public-ingest/worknet-freshness";
import { runWorknetNormalizeFromRaw } from "@/lib/jobs-public-ingest/run-worknet-normalize";
import { revalidateJobsPublic } from "@/lib/jobs-public/revalidate-jobs-public";
import { runWorknetWantedIngest } from "@/lib/jobs-public-ingest/worknet/run-ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handle(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.WORKNET_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "WORKNET_API_KEY 미설정",
    });
  }

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const maxRows = Number(req.nextUrl.searchParams.get("maxRows") ?? process.env.WORKNET_INGEST_MAX_ROWS ?? 500);

  const ingestStartedAt = new Date().toISOString();

  const ingest = await runWorknetWantedIngest({
    supabase,
    apiKey,
    maxRowsPerKeyword: maxRows,
    regDate: "W-2",
  });

  if (!ingest.ok) {
    return NextResponse.json({ ok: false, ingest }, { status: 500 });
  }

  const normalize = await runWorknetNormalizeFromRaw({ supabase, maxRows: 5000 });
  if (!normalize.ok) {
    return NextResponse.json({ ok: false, ingest, normalize }, { status: 500 });
  }

  const closedAbsent = await closeWorknetOpeningsMissingFreshRaw(supabase, ingestStartedAt);

  const spotlight = await computeJobSpotlightSnapshots(supabase);
  if (spotlight.ok) {
    revalidateJobsPublic();
  }

  return NextResponse.json({
    ok: spotlight.ok,
    ingest,
    normalize,
    closedAbsent,
    spotlight,
  });
}

/** 고용24 워크넷: 수집 → 정규화 → 스냅샷 (권장 12시간 cron) */
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
