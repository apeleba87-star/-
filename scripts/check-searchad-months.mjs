import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

for (const phrase of ["서울포장이사", "서울입주청소", "포장이사"]) {
  const { data } = await supabase
    .from("demand_keyword_monthly")
    .select("yyyymm, search_volume_month, source, updated_at")
    .eq("search_phrase", phrase)
    .order("yyyymm");
  console.log("\n===", phrase, "===");
  for (const r of data ?? []) console.log(r.yyyymm, r.search_volume_month, r.source, r.updated_at?.slice(0, 19));
  console.log("count:", data?.length);
}
