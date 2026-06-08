#!/usr/bin/env node
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// dynamic import of generated registry via read + eval is messy; parse lawd-codes file
const lawdSrc = fs.readFileSync("lib/demand/lawd-codes.generated.ts", "utf8");
const entries = [...lawdSrc.matchAll(/"([^"]+)":\s*"(\d+)"/g)].map((m) => ({
  regionKey: m[1],
  lawdCd: m[2],
}));

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const allZero = [];
const partialRecent = [];
const missing = [];
const ok = [];

const BATCH = 40;
for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH);
  const keys = batch.map((e) => e.regionKey);
  const { data } = await sb
    .from("demand_rtms_monthly")
    .select("region_key, yyyymm, sale_count, jeonse_count")
    .eq("region_scope", "district")
    .in("region_key", keys);

  const byKey = new Map();
  for (const r of data ?? []) {
    if (!byKey.has(r.region_key)) byKey.set(r.region_key, []);
    byKey.get(r.region_key).push(r);
  }

  for (const { regionKey, lawdCd } of batch) {
    const pts = byKey.get(regionKey);
    if (!pts?.length) {
      missing.push({ regionKey, lawdCd });
      continue;
    }
    const nonZero = pts.filter((p) => p.sale_count > 0 || p.jeonse_count > 0);
    if (nonZero.length === 0) {
      allZero.push({ regionKey, lawdCd, months: pts.length });
    } else if (nonZero.length <= 4) {
      const sorted = [...nonZero].sort((a, b) => b.yyyymm.localeCompare(a.yyyymm));
      partialRecent.push({
        regionKey,
        lawdCd,
        nonZero: nonZero.length,
        latest: sorted[0],
        oldest: sorted[sorted.length - 1],
      });
    } else {
      ok.push(regionKey);
    }
  }
}

function group(list, field = "regionKey") {
  const g = {};
  for (const item of list) {
    const city = item[field].split(":")[0];
    (g[city] ??= []).push(item);
  }
  return g;
}

console.log("=== 전국 280 시군구 RTMS 감사 (lawd-codes 기준) ===");
console.log("total:", entries.length);
console.log("missing (DB 행 없음):", missing.length);
console.log("allZero (행 있으나 전부 0):", allZero.length);
console.log("partialRecent (nonZero 1~4, backfill 필요):", partialRecent.length);
console.log("ok (nonZero >= 5):", ok.length);

const remapPrefix = { gangwon: "51", jeonbuk: "52" };
console.log("\n--- LAWD 리맵 시·도 ---");
for (const [city, prefix] of Object.entries(remapPrefix)) {
  const cityAll = entries.filter((e) => e.regionKey.startsWith(`${city}:`));
  const z = allZero.filter((x) => x.regionKey.startsWith(`${city}:`));
  const p = partialRecent.filter((x) => x.regionKey.startsWith(`${city}:`));
  const m = missing.filter((x) => x.regionKey.startsWith(`${city}:`));
  const o = ok.filter((k) => k.startsWith(`${city}:`));
  console.log(`${city} (${prefix}xxx): ${cityAll.length}개 — missing ${m.length}, allZero ${z.length}, partial ${p.length}, ok ${o.length}`);
}

console.log("\n--- partialRecent (재수집/backfill 필요) ---");
for (const [city, items] of Object.entries(group(partialRecent)).sort()) {
  console.log(`\n${city} (${items.length}개)`);
  for (const i of items) {
    console.log(`  ${i.regionKey} [${i.lawdCd}] — ${i.nonZero}개월, latest ${i.latest.yyyymm} jeonse=${i.latest.jeonse_count} sale=${i.latest.sale_count}`);
  }
}

console.log("\n--- allZero (LAWD 오류·미수집 의심) ---");
for (const [city, items] of Object.entries(group(allZero)).sort()) {
  console.log(`\n${city} (${items.length}개)`);
  for (const i of items) {
    console.log(`  ${i.regionKey} [${i.lawdCd}] — ${i.months}개월`);
  }
}

if (missing.length) {
  console.log("\n--- missing (미수집) 상위 시도 ---");
  for (const [city, items] of Object.entries(group(missing)).sort()) {
    console.log(`${city}: ${items.length}개`);
  }
}
