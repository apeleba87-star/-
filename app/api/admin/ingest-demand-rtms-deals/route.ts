import { NextRequest, NextResponse } from "next/server";
import { runDemandRtmsDealsIngestJob } from "@/lib/demand/rtms-deals-ingest";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";

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
      service.from("demand_rtms_deals").select("*", { count: "exact", head: true }),
      service
        .from("demand_rtms_deals")
        .select("deal_yyyymm")
        .order("deal_yyyymm", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      totalRows: countRes.count ?? 0,
      latestMonth: latestRes.data?.deal_yyyymm ?? null,
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

  try {
    let monthsBack: number | undefined;
    let cityId: string | undefined;
    let districtSlugs: string[] | undefined;

    try {
      const body = (await req.json()) as {
        monthsBack?: number;
        cityId?: string;
        districtSlugs?: string[];
      };
      if (body?.monthsBack != null && Number.isFinite(body.monthsBack)) {
        monthsBack = Math.round(body.monthsBack);
      }
      if (body?.cityId?.trim()) cityId = body.cityId.trim();
      if (Array.isArray(body?.districtSlugs) && body.districtSlugs.length > 0) {
        districtSlugs = body.districtSlugs.filter((slug) => typeof slug === "string" && slug.trim());
      }
    } catch {
      /* empty body */
    }

    const result = await runDemandRtmsDealsIngestJob(createServiceSupabase(), {
      monthsBack,
      cityId,
      districtSlugs,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: result.needsKey ? 400 : 500 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
