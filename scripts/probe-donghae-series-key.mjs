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
const districtKeys = ["gangwon:dohaesi-si"];
const cutoff = "2022-06";

const { data } = await sb
  .from("demand_rtms_monthly")
  .select("region_scope, region_key, yyyymm, sale_count, jeonse_count")
  .eq("region_scope", "district")
  .in("region_key", districtKeys)
  .gte("yyyymm", cutoff)
  .order("yyyymm", { ascending: true });

const key = `district:${districtKeys[0]}`;
const points = (data ?? []).map((r) => ({
  yyyymm: r.yyyymm,
  saleCount: r.sale_count,
  jeonseCount: r.jeonse_count,
}));
console.log("series key", key);
console.log("points", points.length, "latest", points.at(-1));
const usable = points.some((p) => p.saleCount > 0 || p.jeonseCount > 0);
console.log("usable", usable);
