#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

loadEnvLocal();
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const slug = "gangbuk-gu";

const [rtms, kwMonthly, kwDaily] = await Promise.all([
  sb.from("demand_rtms_monthly").select("*").eq("region_scope", "district").eq("region_key", slug).order("yyyymm"),
  sb.from("demand_keyword_monthly").select("region_scope,region_key,search_phrase,yyyymm,search_volume_month,source").or(
    `and(region_scope.eq.district,region_key.eq.${slug}),and(region_scope.eq.city,region_key.eq.seoul),and(region_scope.eq.national,region_key.eq.kr)`
  ).order("yyyymm", { ascending: false }).limit(50),
  sb.from("demand_keyword_daily").select("region_scope,region_key,search_phrase,source").or(
    `and(region_scope.eq.district,region_key.eq.${slug}),and(region_scope.eq.city,region_key.eq.seoul),and(region_scope.eq.national,region_key.eq.kr)`
  ).limit(20),
]);

console.log("=== RTMS 강북구 ===");
console.log(rtms.data ?? rtms.error);

const natPacking = await sb.from("demand_keyword_monthly")
  .select("yyyymm,search_phrase,search_volume_month")
  .eq("region_scope", "national").eq("region_key", "kr")
  .eq("search_phrase", "포장이사").order("yyyymm");

const PACKING = ["포장이사", "이사업체", "포장이사견적", "이삿집센터"];
const MOVE_IN = ["입주청소", "입주청소업체", "이사청소", "입주청소비용"];

function sumBasket(phrases, rows, yyyymm) {
  return phrases.reduce((s, p) => {
    const r = rows.find((x) => x.search_phrase === p && x.yyyymm === yyyymm);
    return s + (r?.search_volume_month ?? 0);
  }, 0);
}

const natRows = (await sb.from("demand_keyword_monthly").select("*").eq("region_scope", "national").eq("region_key", "kr")).data ?? [];
const months = [...new Set(natRows.map((r) => r.yyyymm))].sort();
const last = months[months.length - 1];
const prev = months[months.length - 2];
const packingMom = Math.round(((sumBasket(PACKING, natRows, last) - sumBasket(PACKING, natRows, prev)) / sumBasket(PACKING, natRows, prev)) * 1000) / 10;
const moveInMom = Math.round(((sumBasket(MOVE_IN, natRows, last) - sumBasket(MOVE_IN, natRows, prev)) / sumBasket(MOVE_IN, natRows, prev)) * 1000) / 10;
const natChange = Math.round(((packingMom * 0.4 + moveInMom * 0.3) / 0.7) * 10) / 10;
const natIndex = Math.round((100 + natChange) * 10) / 10;

console.log("\n=== 전국 이사관심 (계산) ===");
console.log({ last, natIndex, natChange, packingMom, moveInMom });

if (rtms.data?.length >= 2) {
  const sorted = [...rtms.data].sort((a, b) => a.yyyymm.localeCompare(b.yyyymm));
  const c = sorted[sorted.length - 1];
  const p = sorted[sorted.length - 2];
  const saleMom = Math.round(((c.sale_count - p.sale_count) / p.sale_count) * 100);
  const jeonseMom = Math.round(((c.jeonse_count - p.jeonse_count) / p.jeonse_count) * 100);
  const rtmsIndex = Math.round((100 + jeonseMom * 0.7 + saleMom * 0.3) * 10) / 10;
  const rtmsChange = Math.round((jeonseMom * 0.7 + saleMom * 0.3) * 10) / 10;
  const score = Math.round((natIndex * rtmsIndex) / 100 * 10) / 10;
  console.log("\n=== 강북구 지역수요점수 (계산) ===");
  console.log({ rtmsMonth: c.yyyymm, saleMom, jeonseMom, rtmsIndex, rtmsChange, score });
  console.log({ sale: c.sale_count, jeonse: c.jeonse_count });
}

console.log("\n=== 키워드 monthly 스코프별 건수 ===");
const scopes = {};
for (const r of kwMonthly.data ?? []) {
  const k = `${r.region_scope}:${r.region_key}`;
  scopes[k] = (scopes[k] ?? 0) + 1;
}
console.log(scopes);

console.log("\n=== district 강북 키워드 monthly ===");
console.log((kwMonthly.data ?? []).filter((r) => r.region_scope === "district"));

console.log("\n=== 키워드 daily 소스 샘플 ===");
const dailyScopes = {};
for (const r of kwDaily.data ?? []) {
  const k = `${r.region_scope}:${r.region_key}:${r.source}`;
  dailyScopes[k] = (dailyScopes[k] ?? 0) + 1;
}
console.log(dailyScopes);
