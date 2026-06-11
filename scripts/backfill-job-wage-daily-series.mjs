/**
 * 기존 job_wage_daily_reports 중 windowDays=1 행을 시계열 테이블로 백필.
 * Usage: npm run backfill:job-wage-daily-series
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

function weightedMeanDailyWage(provinces) {
  let sumW = 0;
  let sumC = 0;
  for (const p of provinces) {
    if (!p.jobPostCount || p.jobPostCount <= 0) continue;
    sumW += p.avgDailyWage * p.jobPostCount;
    sumC += p.jobPostCount;
  }
  return sumC > 0 ? Math.round(sumW / sumC) : null;
}

function provincesFromPayload(payload) {
  if (payload.provinces?.length) return payload.provinces;
  return [];
}

async function syncRow(supabase, reportDate, payload) {
  if (payload.windowDays !== 1) return { skipped: true };

  const provinces = provincesFromPayload(payload);
  const withData = provinces.filter((p) => p.jobPostCount > 0);
  const top = payload.topProvinceByAvgWage ?? withData[0] ?? null;
  const bottom =
    payload.bottomProvinceByAvgWage ??
    (withData.length >= 2 ? withData[withData.length - 1] : null);

  const nationalRow = {
    report_date: reportDate,
    window_days: 1,
    dominant_category_key: payload.dominantCategory?.id ?? null,
    dominant_category_name: payload.dominantCategory?.name ?? null,
    dominant_position_count: payload.dominantCategory?.positionCount ?? 0,
    total_new_position_count: payload.totalNewPositionCount ?? 0,
    job_post_count: payload.jobPostCount ?? 0,
    national_weighted_avg_wage: weightedMeanDailyWage(provinces),
    top_province: top?.province ?? null,
    top_province_avg_wage: top?.avgDailyWage ?? null,
    bottom_province: bottom?.province ?? null,
    bottom_province_avg_wage: bottom?.avgDailyWage ?? null,
    computed_at: new Date().toISOString(),
  };

  const { error: nationalErr } = await supabase
    .from("job_wage_daily_national_metrics")
    .upsert(nationalRow, { onConflict: "report_date" });
  if (nationalErr) throw new Error(nationalErr.message);

  const { error: deleteErr } = await supabase
    .from("job_wage_daily_province_metrics")
    .delete()
    .eq("report_date", reportDate);
  if (deleteErr) throw new Error(deleteErr.message);

  if (withData.length > 0) {
    const provinceRows = withData.map((p) => ({
      report_date: reportDate,
      province: p.province,
      avg_daily_wage: p.avgDailyWage,
      job_post_count: p.jobPostCount,
    }));
    const { error: provinceErr } = await supabase
      .from("job_wage_daily_province_metrics")
      .insert(provinceRows);
    if (provinceErr) throw new Error(provinceErr.message);
  }

  return { synced: true };
}

async function main() {
  const supabase = createClient(url, key);
  const pageSize = 100;
  let offset = 0;
  let synced = 0;
  let skipped = 0;

  for (;;) {
    const { data: rows, error } = await supabase
      .from("job_wage_daily_reports")
      .select("report_date, payload")
      .order("report_date", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    if (!rows?.length) break;

    for (const row of rows) {
      const payload = row.payload;
      if (!payload || payload.windowDays !== 1) {
        skipped += 1;
        continue;
      }
      await syncRow(supabase, row.report_date, payload);
      synced += 1;
      process.stdout.write(`\rSynced ${synced} (skipped ${skipped}) — ${row.report_date}`);
    }

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`\nDone. synced=${synced} skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
