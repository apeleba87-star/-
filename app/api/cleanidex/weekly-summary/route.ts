import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import {
  expectedDatesForWeekdayRule,
  expectedVisitsForWeeklyCount,
  getWeekDays,
  getWeekStartIso,
  parseIsoDate,
  toIsoDate,
} from "@/lib/cleanidex/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScheduleRule = {
  id: string;
  site_id: string;
  effective_from: string;
  cadence: "weekly_count" | "weekday";
  weekly_count: number | null;
  weekdays: number[] | null;
};

type Override = {
  id: string;
  site_id: string;
  week_start: string;
  kind: "skip" | "add";
  occur_date: string;
};

type SiteRow = {
  id: string;
  name: string;
  client_id: string;
  client: { id: string; name: string } | null;
};

type WorkSessionRow = {
  id: string;
  site_id: string;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  completed_at: string | null;
};

type SiteSummary = {
  site_id: string;
  site_name: string;
  client_id: string;
  client_name: string | null;
  rule: {
    cadence: "weekly_count" | "weekday";
    weekly_count: number | null;
    weekdays: number[] | null;
    effective_from: string | null;
  } | null;
  expected_count: number;
  expected_dates: string[] | null; // weekday rule 일 때만
  completed_count: number;
  completed_dates: string[];
  in_progress_dates: string[]; // start_time만 찍힘 등
  added_dates: string[];
  skipped_dates: string[];
  rate: number; // 0..1 (expected=0이면 0 으로 처리, has_no_rule=true 도 함께 노출)
  has_no_rule: boolean;
};

function pickActiveRule(rules: ScheduleRule[], weekStartIso: string): ScheduleRule | null {
  // effective_from <= week_start 중 가장 큰 effective_from 선택. 없으면 null.
  const eligible = rules.filter((r) => r.effective_from <= weekStartIso);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, cur) => (cur.effective_from > best.effective_from ? cur : best));
}

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const weekParam = sp.get("week_start");
  const baseDate = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? parseIsoDate(weekParam) : new Date();
  const weekStartIso = getWeekStartIso(baseDate);
  const weekStart = parseIsoDate(weekStartIso);
  const weekDays = getWeekDays(weekStart);
  const weekEndExclusive = new Date(
    Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate() + 7)
  );
  const weekEndIso = toIsoDate(weekEndExclusive); // exclusive

  const supabase = await createServerSupabase();

  // 1) 회사의 전체 사이트 + 거래처명
  const { data: sitesData, error: sitesErr } = await supabase
    .schema("cleanidex")
    .from("sites")
    .select("id, name, client_id, client:clients!inner(id, name)")
    .eq("company_id", context.companyId)
    .order("name", { ascending: true });
  if (sitesErr) return NextResponse.json({ ok: false, error: sitesErr.message }, { status: 400 });
  const sites = (sitesData ?? []) as unknown as SiteRow[];
  if (sites.length === 0) {
    return NextResponse.json({
      ok: true,
      week_start: weekStartIso,
      week_days: weekDays,
      sites: [] as SiteSummary[],
    });
  }
  const siteIds = sites.map((s) => s.id);

  // 2) 활성 룰 후보(effective_from <= 주 시작) — site별 최신 1건씩 잡으려고 충분히 가져옴
  const { data: rulesData, error: rulesErr } = await supabase
    .schema("cleanidex")
    .from("site_schedule_rules")
    .select("id, site_id, effective_from, cadence, weekly_count, weekdays")
    .in("site_id", siteIds)
    .lte("effective_from", weekStartIso)
    .order("effective_from", { ascending: false });
  if (rulesErr) return NextResponse.json({ ok: false, error: rulesErr.message }, { status: 400 });
  const rulesBySite = new Map<string, ScheduleRule[]>();
  for (const r of (rulesData ?? []) as ScheduleRule[]) {
    const arr = rulesBySite.get(r.site_id) ?? [];
    arr.push(r);
    rulesBySite.set(r.site_id, arr);
  }

  // 3) 해당 주의 오버라이드
  const { data: overridesData, error: ovErr } = await supabase
    .schema("cleanidex")
    .from("site_visit_overrides")
    .select("id, site_id, week_start, kind, occur_date")
    .in("site_id", siteIds)
    .eq("week_start", weekStartIso);
  if (ovErr) return NextResponse.json({ ok: false, error: ovErr.message }, { status: 400 });
  const overridesBySite = new Map<string, Override[]>();
  for (const o of (overridesData ?? []) as Override[]) {
    const arr = overridesBySite.get(o.site_id) ?? [];
    arr.push(o);
    overridesBySite.set(o.site_id, arr);
  }

  // 4) 해당 주의 work_sessions
  const { data: sessionsData, error: ssErr } = await supabase
    .schema("cleanidex")
    .from("work_sessions")
    .select("id, site_id, work_date, start_time, end_time, completed_at")
    .in("site_id", siteIds)
    .gte("work_date", weekStartIso)
    .lt("work_date", weekEndIso);
  if (ssErr) return NextResponse.json({ ok: false, error: ssErr.message }, { status: 400 });
  const sessionsBySite = new Map<string, WorkSessionRow[]>();
  for (const s of (sessionsData ?? []) as WorkSessionRow[]) {
    const arr = sessionsBySite.get(s.site_id) ?? [];
    arr.push(s);
    sessionsBySite.set(s.site_id, arr);
  }

  // 5) site별 요약 계산
  const summaries: SiteSummary[] = sites.map((site) => {
    const rules = rulesBySite.get(site.id) ?? [];
    const rule = pickActiveRule(rules, weekStartIso);
    const overrides = overridesBySite.get(site.id) ?? [];
    const sessions = sessionsBySite.get(site.id) ?? [];

    const skipDates = new Set(overrides.filter((o) => o.kind === "skip").map((o) => o.occur_date));
    const addDates = overrides.filter((o) => o.kind === "add").map((o) => o.occur_date);

    let expectedDates: string[] | null = null;
    let expectedCount = 0;

    if (rule) {
      if (rule.cadence === "weekday" && rule.weekdays && rule.weekdays.length > 0) {
        const base = expectedDatesForWeekdayRule(weekStartIso, rule.weekdays);
        const filtered = base.filter((d) => !skipDates.has(d));
        const merged = new Set<string>(filtered);
        for (const a of addDates) merged.add(a);
        const all = Array.from(merged).sort();
        expectedDates = all;
        expectedCount = all.length;
      } else if (rule.cadence === "weekly_count" && typeof rule.weekly_count === "number") {
        const skipCount = overrides.filter((o) => o.kind === "skip").length;
        const addCount = addDates.length;
        expectedCount = Math.max(
          0,
          expectedVisitsForWeeklyCount(rule.weekly_count) - skipCount + addCount
        );
        expectedDates = null;
      }
    }

    const completedDates: string[] = [];
    const inProgressDates: string[] = [];
    for (const s of sessions) {
      if (s.completed_at) completedDates.push(s.work_date);
      else if (s.start_time || s.end_time) inProgressDates.push(s.work_date);
    }
    const completedCount = completedDates.length;
    const rate = expectedCount === 0 ? 0 : Math.min(1, completedCount / expectedCount);

    return {
      site_id: site.id,
      site_name: site.name,
      client_id: site.client_id,
      client_name: site.client?.name ?? null,
      rule: rule
        ? {
            cadence: rule.cadence,
            weekly_count: rule.weekly_count,
            weekdays: rule.weekdays,
            effective_from: rule.effective_from,
          }
        : null,
      expected_count: expectedCount,
      expected_dates: expectedDates,
      completed_count: completedCount,
      completed_dates: completedDates.sort(),
      in_progress_dates: inProgressDates.sort(),
      added_dates: addDates.sort(),
      skipped_dates: Array.from(skipDates).sort(),
      rate,
      has_no_rule: rule === null,
    };
  });

  return NextResponse.json({
    ok: true,
    week_start: weekStartIso,
    week_days: weekDays,
    sites: summaries,
  });
}
