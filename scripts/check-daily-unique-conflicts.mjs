import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await supabase
  .from("demand_keyword_daily")
  .select("keyword_key, region_scope, region_key, period_date, source, search_phrase, id")
  .limit(5000);

const groups = new Map();
for (const r of data ?? []) {
  const key = `${r.keyword_key}|${r.region_scope}|${r.region_key}|${r.period_date}|${r.source}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

const multi = [...groups.entries()].filter(([, rows]) => rows.length > 1);
console.log("rows sampled:", data?.length);
console.log("groups with >1 row (same key w/o phrase):", multi.length);
for (const [k, rows] of multi.slice(0, 10)) {
  console.log(k, "->", rows.map((r) => r.search_phrase ?? "(null)").join(", "));
}
