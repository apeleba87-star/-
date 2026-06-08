#!/usr/bin/env node
/** 미수집 시·도 RTMS 36개월 backfill + 전국 합산 갱신 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { runDemandRtmsIngestJob } from "../lib/demand/rtms-ingest.ts";
import { DEMAND_RTMS_MONTHS_BACK_BACKFILL } from "../lib/demand/rtms-ingest.ts";
import { DEMAND_LAWD_BY_REGION_KEY } from "../lib/demand/lawd-codes.generated.ts";
import { DEMAND_RTMS_BACKFILL_BATCHES } from "../lib/demand/rtms-backfill-batches.ts";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
for (const [k, v] of Object.entries(env)) {
  if (!process.env[k]) process.env[k] = v;
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const monthsBack = DEMAND_RTMS_MONTHS_BACK_BACKFILL;
const keys = Object.keys(DEMAND_LAWD_BY_REGION_KEY);

async function missingByCity() {
  const missing = new Map();
  const BATCH = 40;
  for (let i = 0; i < keys.length; i += BATCH) {
    const batch = keys.slice(i, i + BATCH);
    const { data } = await supabase
      .from("demand_rtms_monthly")
      .select("region_key")
      .eq("region_scope", "district")
      .in("region_key", batch);
    const have = new Set((data ?? []).map((r) => r.region_key));
    for (const k of batch) {
      if (!have.has(k)) {
        const city = k.split(":")[0];
        missing.set(city, (missing.get(city) ?? 0) + 1);
      }
    }
  }
  return missing;
}

const missing = await missingByCity();
console.log("missing districts by city:", Object.fromEntries(missing));

const batches = [
  ...DEMAND_RTMS_BACKFILL_BATCHES.filter((b) => b.cityId && !b.nationalRefreshOnly),
  {
    step: 99,
    id: "city:seoul",
    label: "서울특별시",
    cityId: "seoul",
    districtCount: 25,
    monthsBack,
    refreshNational: false,
  },
];

const toRun = batches.filter((b) => {
  if (!b.cityId) return false;
  if (b.cityId === "gangwon" || b.cityId === "jeonbuk") return false;
  return (missing.get(b.cityId) ?? 0) > 0;
});

console.log(
  "batches to run:",
  toRun.map((b) => `${b.id} (missing ${missing.get(b.cityId) ?? 0})`)
);

for (const batch of toRun) {
  console.log(`\n========== ${batch.label} (${batch.id}) ==========`);
  const started = Date.now();
  const result = await runDemandRtmsIngestJob(supabase, {
    cityId: batch.cityId,
    districtSlugs: batch.districtSlugs,
    monthsBack: batch.monthsBack,
    refreshNational: false,
  });
  console.log(JSON.stringify(result, null, 2));
  console.log(`elapsed ${Math.round((Date.now() - started) / 1000)}s`);
  if (!result.ok) {
    console.error("failed", batch.id);
    process.exit(1);
  }
}

console.log("\n========== national refresh ==========");
const nat = await runDemandRtmsIngestJob(supabase, {
  nationalRefreshOnly: true,
  monthsBack,
  refreshNational: false,
});
console.log(JSON.stringify(nat, null, 2));

const missingAfter = await missingByCity();
console.log("\nmissing after:", Object.fromEntries(missingAfter));
console.log("total missing:", [...missingAfter.values()].reduce((a, b) => a + b, 0));
