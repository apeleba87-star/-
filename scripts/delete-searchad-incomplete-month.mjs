import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from("demand_keyword_monthly")
  .delete()
  .eq("yyyymm", "2026-06")
  .eq("source", "searchad")
  .select("search_phrase, region_scope, region_key");

if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log("Deleted", data?.length ?? 0, "rows for 2026-06 (API rolling snapshot)");
