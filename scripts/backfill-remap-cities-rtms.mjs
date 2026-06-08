#!/usr/bin/env node
/** 강원(51)·전북(52) LAWD 보정 지역 RTMS 36개월 backfill */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { runDemandRtmsIngestJob } from "../lib/demand/rtms-ingest.ts";
import { DEMAND_RTMS_MONTHS_BACK_BACKFILL } from "../lib/demand/rtms-ingest.ts";

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

const cities = [
  { cityId: "gangwon", label: "강원특별자치도" },
  { cityId: "jeonbuk", label: "전북특별자치도" },
];

for (const { cityId, label } of cities) {
  console.log(`\n========== ${label} (${cityId}) ${monthsBack}개월 backfill ==========`);
  const started = Date.now();
  const result = await runDemandRtmsIngestJob(supabase, {
    cityId,
    monthsBack,
    refreshNational: false,
  });
  console.log(JSON.stringify(result, null, 2));
  console.log(`elapsed ${Math.round((Date.now() - started) / 1000)}s`);
  if (!result.ok) {
    console.error(`${cityId} failed`);
    process.exit(1);
  }
}

// sample verify
const samples = [
  "gangwon:dohaesi-si",
  "jeonbuk:gunsansi-si",
  "jeonbuk:jeonju-wansangu-gu",
];
for (const key of samples) {
  const { data } = await supabase
    .from("demand_rtms_monthly")
    .select("yyyymm, sale_count, jeonse_count")
    .eq("region_scope", "district")
    .eq("region_key", key)
    .order("yyyymm", { ascending: false })
    .limit(5);
  const nonZero = (data ?? []).filter((r) => r.sale_count > 0 || r.jeonse_count > 0);
  console.log(`\n${key}: months=${data?.length} nonZero=${nonZero.length}`, data?.slice(0, 3));
}
