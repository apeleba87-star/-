#!/usr/bin/env node
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const keys = ["gangwon:dohaesi-si", "dohaesi-si"];
for (const k of keys) {
  const { data, count } = await sb
    .from("demand_rtms_monthly")
    .select("yyyymm, sale_count, jeonse_count", { count: "exact" })
    .eq("region_scope", "district")
    .eq("region_key", k)
    .order("yyyymm", { ascending: false })
    .limit(5);
  console.log("key", k, "count", count, data);
}

const { data: gangwon } = await sb
  .from("demand_rtms_monthly")
  .select("region_key")
  .eq("region_scope", "district")
  .like("region_key", "gangwon:%")
  .limit(5000);
const unique = [...new Set((gangwon ?? []).map((r) => r.region_key))].sort();
console.log("gangwon district keys", unique.length);

const compare = ["gangwon:chuncheonsi-si", "gangwon:wonjusi-si", "gangwon:sogchosi-si", "gangwon:dohaesi-si"];
for (const k of compare) {
  const { data } = await sb
    .from("demand_rtms_monthly")
    .select("yyyymm, sale_count, jeonse_count")
    .eq("region_scope", "district")
    .eq("region_key", k)
    .order("yyyymm", { ascending: false });
  const nonZero = (data ?? []).filter((r) => r.sale_count > 0 || r.jeonse_count > 0);
  console.log(k, "months", data?.length, "nonZeroAll", nonZero.length, "sample", nonZero.slice(0, 2));
}

// seoul sample
const { data: gangnam } = await sb
  .from("demand_rtms_monthly")
  .select("yyyymm, sale_count, jeonse_count")
  .eq("region_scope", "district")
  .eq("region_key", "seoul:gangnam-gu")
  .eq("yyyymm", "2026-05");
console.log("seoul:gangnam-gu 2026-05", gangnam?.[0]);
