import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { runDemandKeywordIngestJob } from "@/lib/demand/keyword-ingest";
import { SEARCHAD_ROLLING_30D_SOURCE } from "@/lib/demand/searchad-rolling-volume";
import { getSearchAdCredentialsStatus } from "@/lib/naver/searchad-keyword-client";
import { listNationalBasketIngestPhrases } from "@/lib/demand/keyword-baskets";

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
    const [dailyRes, monthlyRes, districtDailyRes, datalabDistrictRes, rollingRes, rollingLatestRes] =
      await Promise.all([
        service.from("demand_keyword_daily").select("*", { count: "exact", head: true }),
        service.from("demand_keyword_monthly").select("*", { count: "exact", head: true }),
        service
          .from("demand_keyword_daily")
          .select("*", { count: "exact", head: true })
          .eq("region_scope", "district"),
        service
          .from("demand_keyword_daily")
          .select("*", { count: "exact", head: true })
          .eq("region_scope", "district")
          .eq("source", "datalab"),
        service
          .from("demand_keyword_daily")
          .select("*", { count: "exact", head: true })
          .eq("source", SEARCHAD_ROLLING_30D_SOURCE),
        service
          .from("demand_keyword_daily")
          .select("period_date")
          .eq("source", SEARCHAD_ROLLING_30D_SOURCE)
          .order("period_date", { ascending: false })
          .limit(1),
      ]);
    const datalabConfigured = Boolean(
      process.env.NAVER_CLIENT_ID?.trim() && process.env.NAVER_CLIENT_SECRET?.trim()
    );
    const searchadMonthly = await service
      .from("demand_keyword_monthly")
      .select("*", { count: "exact", head: true })
      .in("source", ["searchad", "searchad_console"]);

    const { data: yyyymmRows } = await service
      .from("demand_keyword_monthly")
      .select("yyyymm")
      .in("source", ["searchad", "searchad_console"]);
    const searchadDistinctMonths = new Set((yyyymmRows ?? []).map((r) => r.yyyymm)).size;

    const basketPhrases = listNationalBasketIngestPhrases().map((p) => p.phrase);
    const { data: nationalBasketRows } = await service
      .from("demand_keyword_monthly")
      .select("search_phrase")
      .in("source", ["searchad", "searchad_console"])
      .eq("region_scope", "national")
      .in("search_phrase", basketPhrases);
    const searchadBasketPhrases = new Set(
      (nationalBasketRows ?? []).map((r) => r.search_phrase).filter(Boolean)
    ).size;

    return NextResponse.json({
      ok: true,
      dailyRows: dailyRes.count ?? 0,
      monthlyRows: monthlyRes.count ?? 0,
      districtDailyRows: districtDailyRes.count ?? 0,
      datalabDistrictRows: datalabDistrictRes.count ?? 0,
      datalabConfigured,
      searchadMonthlyRows: searchadMonthly.count ?? 0,
      searchadDistinctMonths,
      searchadBasketPhrases,
      searchadBasketPhraseTarget: basketPhrases.length,
      searchadRollingRows: rollingRes.count ?? 0,
      searchadRollingLatestDate:
        rollingLatestRes.data?.[0]?.period_date != null
          ? String(rollingLatestRes.data[0].period_date).slice(0, 10)
          : null,
      searchAdCredentials: getSearchAdCredentialsStatus(),
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
