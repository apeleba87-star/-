import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const slugs = ["gangdong-gu", "guro-gu", "yangcheon-gu"];
const names = { "gangdong-gu": "강동구", "guro-gu": "구로구", "yangcheon-gu": "양천구" };

function mom(curr, prev) {
  if (!prev || prev <= 0) return 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function rtmsIndex(saleMom, jeonseMom) {
  return Math.round((100 + jeonseMom * 0.7 + saleMom * 0.3) * 10) / 10;
}

for (const slug of slugs) {
  const { data } = await supabase
    .from("demand_rtms_monthly")
    .select("yyyymm, sale_count, jeonse_count")
    .eq("region_scope", "district")
    .eq("region_key", slug)
    .order("yyyymm");
  console.log(`\n=== ${names[slug]} ===`);
  const rows = data ?? [];
  for (let i = 1; i < rows.length; i++) {
    const cur = rows[i];
    const prev = rows[i - 1];
    const jeonseMom = mom(cur.jeonse_count, prev.jeonse_count);
    const saleMom = mom(cur.sale_count, prev.sale_count);
    const idx = rtmsIndex(saleMom, jeonseMom);
    if (cur.yyyymm >= "2025-10") {
      console.log(
        cur.yyyymm,
        `전월세 ${cur.jeonse_count}`,
        `MoM ${jeonseMom}%`,
        `RTMS지수 ${idx}`,
        `(전월 ${prev.jeonse_count})`
      );
    }
  }
}
