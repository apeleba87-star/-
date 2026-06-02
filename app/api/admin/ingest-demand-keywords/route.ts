import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { runDemandKeywordIngestJob } from "@/lib/demand/keyword-ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
    const [dailyRes, monthlyRes] = await Promise.all([
      service.from("demand_keyword_daily").select("*", { count: "exact", head: true }),
      service.from("demand_keyword_monthly").select("*", { count: "exact", head: true }),
    ]);
    return NextResponse.json({
      ok: true,
      dailyRows: dailyRes.count ?? 0,
      monthlyRows: monthlyRes.count ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  const gate = await requireAdminEditor();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }
  try {
    const service = createServiceSupabase();
    const result = await runDemandKeywordIngestJob(service);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 500,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
