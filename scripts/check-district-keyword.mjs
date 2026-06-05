import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

for (const key of ["city:seoul", "district:seoul:gangdong-gu"]) {
  const monthly = await s
    .from("demand_keyword_monthly")
    .select("search_phrase, yyyymm, search_volume_month, source")
    .eq("region_scope", key.startsWith("city") ? "city" : "district")
    .eq("region_key", key.startsWith("city") ? "seoul" : "seoul:gangdong-gu")
    .order("yyyymm");
  const dailyCount = await s
    .from("demand_keyword_daily")
    .select("*", { count: "exact", head: true })
    .eq("region_scope", key.startsWith("city") ? "city" : "district")
    .eq("region_key", key.startsWith("city") ? "seoul" : "seoul:gangdong-gu")
    .eq("keyword_key", "packing");
  console.log("\n", key, "monthly", monthly.data?.length, "packing daily rows", dailyCount.count);
}
