import { NextResponse } from "next/server";
import { revalidateDemandHub } from "@/lib/demand/revalidate-hub";
import { runDemandSearchAdMonthlyIngestJob } from "@/lib/demand/searchad-monthly-ingest";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { getSearchAdCredentialsStatus } from "@/lib/naver/searchad-keyword-client";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

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

  const creds = getSearchAdCredentialsStatus();
  try {
    const service = createServiceSupabase();
    const { count, error } = await service
      .from("demand_keyword_monthly")
      .select("*", { count: "exact", head: true })
      .eq("source", "searchad");

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      credentials: creds,
      searchadMonthlyRows: count ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = await requireAdminEditor();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  try {
    let cityId: string | undefined;
    try {
      const body = (await req.json()) as { cityId?: string };
      if (body?.cityId?.trim()) {
        cityId = body.cityId.trim();
      }
    } catch {
      /* empty body */
    }
    const service = createServiceSupabase();
    const result = await runDemandSearchAdMonthlyIngestJob(service, { cityId });
    if (result.ok) {
      revalidateDemandHub();
    }
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
