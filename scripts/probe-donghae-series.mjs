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
const key = "gangwon:dohaesi-si";
const cutoff = "2022-06";

const { data } = await sb
  .from("demand_rtms_monthly")
  .select("yyyymm, sale_count, jeonse_count")
  .eq("region_scope", "district")
  .eq("region_key", key)
  .gte("yyyymm", cutoff)
  .order("yyyymm", { ascending: true });

const nonZero = (data ?? []).filter((r) => r.sale_count > 0 || r.jeonse_count > 0);
console.log("total", data?.length, "nonZero", nonZero.length);
console.log("last 5", (data ?? []).slice(-5));
console.log("latest nonZero", nonZero.slice(-3));
