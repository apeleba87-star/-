#!/usr/bin/env node
/** 강원 LAWD 51xxxx 보정 후 RTMS 재수집 (동해 등) */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { runDemandRtmsIngestJob } from "../lib/demand/rtms-ingest.ts";

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

console.log("Ingesting gangwon with updated LAWD 51xxxx...");
const result = await runDemandRtmsIngestJob(supabase, {
  cityId: "gangwon",
  monthsBack: 3,
  refreshNational: false,
});
console.log(JSON.stringify(result, null, 2));

if (result.ok) {
  const { data } = await supabase
    .from("demand_rtms_monthly")
    .select("yyyymm, sale_count, jeonse_count")
    .eq("region_scope", "district")
    .eq("region_key", "gangwon:dohaesi-si")
    .order("yyyymm", { ascending: false })
    .limit(3);
  console.log("donghae after ingest", data);
}
