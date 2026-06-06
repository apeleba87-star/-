#!/usr/bin/env node
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function countDistricts() {
  const { count } = await supabase
    .from("demand_rtms_monthly")
    .select("region_key", { count: "exact", head: true })
    .eq("region_scope", "district");
  console.log("district row count (head):", count);

  const keys = new Set();
  let from = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("demand_rtms_monthly")
      .select("region_key")
      .eq("region_scope", "district")
      .range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) keys.add(r.region_key);
    if (data.length < page) break;
    from += page;
  }
  console.log("unique district keys (paginated):", keys.size);
  const byCity = {};
  for (const k of keys) {
    const city = k.split(":")[0];
    byCity[city] = (byCity[city] ?? 0) + 1;
  }
  console.log("by city:", byCity);
}

const gimhaeKey = "gyeongnam:gimhaesi-si";
const { data: gimhae } = await supabase
  .from("demand_rtms_monthly")
  .select("yyyymm, sale_count, jeonse_count")
  .eq("region_scope", "district")
  .eq("region_key", gimhaeKey)
  .order("yyyymm");

console.log("\n=== 김해 RTMS ===");
console.log("months:", gimhae?.length ?? 0);
if (gimhae?.length) {
  console.log("range:", gimhae[0].yyyymm, "~", gimhae.at(-1).yyyymm);
}

await countDistricts();

const { data: cityGn } = await supabase
  .from("demand_rtms_monthly")
  .select("yyyymm")
  .eq("region_scope", "city")
  .eq("region_key", "gyeongnam")
  .order("yyyymm");
console.log("\ncity gyeongnam RTMS months:", cityGn?.length ?? 0);
