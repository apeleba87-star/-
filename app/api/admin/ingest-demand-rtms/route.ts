import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { runDemandRtmsIngestJob } from "@/lib/demand/rtms-ingest";

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
    const [countRes, latestRes] = await Promise.all([
      service.from("demand_rtms_monthly").select("*", { count: "exact", head: true }),
      service
        .from("demand_rtms_monthly")
        .select("yyyymm")
        .order("yyyymm", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return NextResponse.json({
      ok: true,
      totalRows: countRes.count ?? 0,
      latestMonth: latestRes.data?.yyyymm ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  const gate = await requireAdminEditor();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }
  try {
    const service = createServiceSupabase();
    const result = await runDemandRtmsIngestJob(service);
    if (!result.ok) {
      return NextResponse.json(result, { status: result.needsKey ? 400 : 500 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
