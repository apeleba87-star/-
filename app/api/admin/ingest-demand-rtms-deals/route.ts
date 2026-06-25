import { NextRequest, NextResponse } from "next/server";
import {
  createDemandRtmsDealIngestJobs,
  getDemandRtmsDealIngestJobStats,
  processDemandRtmsDealIngestJobs,
  retryFailedDemandRtmsDealIngestJobs,
} from "@/lib/demand/rtms-deal-ingest-jobs";
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
    const [countRes, latestRes, jobStats] = await Promise.all([
      service.from("demand_rtms_deals").select("*", { count: "exact", head: true }),
      service
        .from("demand_rtms_deals")
        .select("deal_yyyymm")
        .order("deal_yyyymm", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getDemandRtmsDealIngestJobStats(service),
    ]);

    return NextResponse.json({
      ok: true,
      totalRows: countRes.count ?? 0,
      latestMonth: latestRes.data?.deal_yyyymm ?? null,
      jobStats,
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
    let action: "runDirect" | "planJobs" | "processJobs" | "retryFailed" = "runDirect";
    let maxJobs: number | undefined;

    try {
      const body = (await req.json()) as {
        action?: "runDirect" | "planJobs" | "processJobs" | "retryFailed";
        monthsBack?: number;
        cityId?: string;
        districtSlugs?: string[];
        maxJobs?: number;
      };
      if (body?.action) action = body.action;
      if (body?.monthsBack != null && Number.isFinite(body.monthsBack)) {
        monthsBack = Math.round(body.monthsBack);
      }
      if (body?.cityId?.trim()) cityId = body.cityId.trim();
      if (Array.isArray(body?.districtSlugs) && body.districtSlugs.length > 0) {
        districtSlugs = body.districtSlugs.filter((slug) => typeof slug === "string" && slug.trim());
      }
      if (body?.maxJobs != null && Number.isFinite(body.maxJobs)) {
        maxJobs = Math.round(body.maxJobs);
      }
    } catch {
      /* empty body */
    }

    const service = createServiceSupabase();
    if (action === "planJobs") {
      if (!cityId) {
        return NextResponse.json(
          { ok: false, error: "Manual backfill requires a cityId. Use the cron planner for nationwide jobs." },
          { status: 400 }
        );
      }
      const result = await createDemandRtmsDealIngestJobs(service, {
        monthsBack,
        cityId,
        districtSlugs,
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 500 });
    }
    if (action === "processJobs") {
      const result = await processDemandRtmsDealIngestJobs(service, { maxJobs });
      return NextResponse.json(result, { status: result.ok ? 200 : 500 });
    }
    if (action === "retryFailed") {
      const result = await retryFailedDemandRtmsDealIngestJobs(service);
      return NextResponse.json(result, { status: result.ok ? 200 : 500 });
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
