import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { computeJobSpotlightSnapshots } from "@/lib/jobs-public-ingest/compute-job-spotlight-snapshots";
import { runWorknetNormalizeFromRaw } from "@/lib/jobs-public-ingest/run-worknet-normalize";
import { runWorknetWantedIngest } from "@/lib/jobs-public-ingest/worknet/run-ingest";
import { JOB_OPEN_DATA_SOURCE_WORKNET_WANTED } from "@/lib/jobs-public-ingest/source-slugs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function requireAdminEditor() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const };
}

export async function GET() {
  const gate = await requireAdminEditor();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }
  try {
    const service = createServiceSupabase();
    const [rawRes, openRes] = await Promise.all([
      service
        .from("job_open_data_raw")
        .select("*", { count: "exact", head: true })
        .eq("source_slug", JOB_OPEN_DATA_SOURCE_WORKNET_WANTED),
      service
        .from("public_job_openings")
        .select("*", { count: "exact", head: true })
        .eq("is_open", true),
    ]);
    return NextResponse.json({
      ok: true,
      worknetRawCount: rawRes.count ?? 0,
      openPublicCount: openRes.count ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminEditor();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }
  const apiKey = process.env.WORKNET_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "WORKNET_API_KEY 미설정" }, { status: 400 });
  }
  let service;
  try {
    service = createServiceSupabase();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
  const maxRows = Number(req.nextUrl.searchParams.get("maxRows") ?? 300);
  const ingest = await runWorknetWantedIngest({ supabase: service, apiKey, maxRowsPerKeyword: maxRows });
  if (!ingest.ok) {
    return NextResponse.json({ ok: false, ingest }, { status: 500 });
  }
  const normalize = await runWorknetNormalizeFromRaw({ supabase: service, maxRows: 5000 });
  const spotlight = await computeJobSpotlightSnapshots(service);
  return NextResponse.json({ ok: true, ingest, normalize, spotlight });
}
