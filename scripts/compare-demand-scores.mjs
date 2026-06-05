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

function natIndex(packingMom, moveInMom) {
  const change = Math.round((packingMom * 0.4 + moveInMom * 0.3) / 0.7 * 10) / 10;
  return Math.round((100 + change) * 10) / 10;
}

// national basket monthly volumes
const { data: natVol } = await supabase
  .from("demand_keyword_monthly")
  .select("keyword_key, yyyymm, search_volume_month, search_phrase")
  .eq("region_scope", "national")
  .in("source", ["searchad", "searchad_console"])
  .order("yyyymm");

const packingByYm = new Map();
const moveInByYm = new Map();
for (const r of natVol ?? []) {
  const phrase = (r.search_phrase ?? "").replace(/\s/g, "");
  const v = r.search_volume_month ?? 0;
  if (r.keyword_key === "packing") {
    packingByYm.set(r.yyyymm, (packingByYm.get(r.yyyymm) ?? 0) + v);
  }
  if (r.keyword_key === "move_in_clean" && ["입주청소", "입주청소업체", "이사청소", "입주청소비용"].some((p) => phrase.includes(p.replace(/\s/g, "")) || phrase === p)) {
    moveInByYm.set(r.yyyymm, (moveInByYm.get(r.yyyymm) ?? 0) + v);
  }
}

const months = [...new Set([...packingByYm.keys(), ...moveInByYm.keys()])].sort();
const natByYm = new Map();
for (let i = 1; i < months.length; i++) {
  const ym = months[i];
  const prev = months[i - 1];
  const pMom = mom(packingByYm.get(ym), packingByYm.get(prev));
  const mMom = mom(moveInByYm.get(ym), moveInByYm.get(prev));
  natByYm.set(ym, natIndex(pMom, mMom));
}

for (const ym of ["2025-12", "2026-05"]) {
  console.log(`\n===== ${ym} (전국 관심 ${natByYm.get(ym) ?? "?"}) =====`);
  const nat = natByYm.get(ym) ?? 100;
  for (const slug of slugs) {
    const { data } = await supabase
      .from("demand_rtms_monthly")
      .select("yyyymm, sale_count, jeonse_count")
      .eq("region_key", slug)
      .order("yyyymm");
    const rows = data ?? [];
    const idx = rows.findIndex((r) => r.yyyymm === ym);
    if (idx < 1) continue;
    const cur = rows[idx];
    const prev = rows[idx - 1];
    const jeonseMom = mom(cur.jeonse_count, prev.jeonse_count);
    const saleMom = mom(cur.sale_count, prev.sale_count);
    const rtms = rtmsIndex(saleMom, jeonseMom);
    const score = Math.round((nat * rtms) / 100 * 10) / 10;
    console.log(
      names[slug],
      `전월세 ${cur.jeonse_count}건`,
      `전월세MoM ${jeonseMom}%`,
      `RTMS지수 ${rtms}`,
      `→ 점수 ${score}`
    );
  }
}
