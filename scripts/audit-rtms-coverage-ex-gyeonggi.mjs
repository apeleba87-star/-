#!/usr/bin/env node
/** 경기도 제외 — RTMS 백필(36개월) 누락·불완전 시군구·시·도 집계 */

import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { DEMAND_REGION_REGISTRY } from "../lib/demand/region-registry.generated.ts";

const EXPECTED_MONTHS = 36;
const EXCLUDE_CITIES = new Set(["gyeonggi", "seoul"]);

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function districtKey(cityId, slug) {
  return `${cityId}:${slug}`;
}

/** 기대 시군구 목록 (경기·서울 제외) */
const expected = [];
for (const city of DEMAND_REGION_REGISTRY) {
  if (EXCLUDE_CITIES.has(city.id)) continue;
  for (const d of city.districts) {
    expected.push({
      cityId: city.id,
      cityLabel: city.fullLabel,
      gu: d.gu,
      slug: d.slug,
      regionKey: districtKey(city.id, d.slug),
    });
  }
}

/** district RTMS — region_key × yyyymm 집계 (paginated) */
const monthCountByDistrict = new Map();
let from = 0;
const page = 1000;
while (true) {
  const { data, error } = await supabase
    .from("demand_rtms_monthly")
    .select("region_key, yyyymm")
    .eq("region_scope", "district")
    .range(from, from + page - 1);
  if (error) throw error;
  if (!data?.length) break;
  for (const r of data) {
    const key = r.region_key;
    if (!monthCountByDistrict.has(key)) monthCountByDistrict.set(key, new Set());
    monthCountByDistrict.get(key).add(r.yyyymm);
  }
  if (data.length < page) break;
  from += page;
}

/** city RTMS */
const monthCountByCity = new Map();
from = 0;
while (true) {
  const { data, error } = await supabase
    .from("demand_rtms_monthly")
    .select("region_key, yyyymm")
    .eq("region_scope", "city")
    .range(from, from + page - 1);
  if (error) throw error;
  if (!data?.length) break;
  for (const r of data) {
    if (!monthCountByCity.has(r.region_key)) monthCountByCity.set(r.region_key, new Set());
    monthCountByCity.get(r.region_key).add(r.yyyymm);
  }
  if (data.length < page) break;
  from += page;
}

const missing = [];
const partial = [];
const complete = [];

for (const row of expected) {
  const months = monthCountByDistrict.get(row.regionKey);
  const n = months?.size ?? 0;
  if (n === 0) {
    missing.push({ ...row, months: 0 });
  } else if (n < EXPECTED_MONTHS) {
    const sorted = [...(months ?? [])].sort();
    partial.push({
      ...row,
      months: n,
      range: `${sorted[0]}~${sorted.at(-1)}`,
    });
  } else {
    complete.push(row);
  }
}

console.log("=== RTMS 백필 점검 (경기·서울 제외) ===");
console.log("기대 시군구:", expected.length);
console.log(`완료 (${EXPECTED_MONTHS}개월+):`, complete.length);
console.log("부분 수집:", partial.length);
console.log("미수집:", missing.length);

/** 시·도별 요약 */
const byCity = new Map();
for (const row of expected) {
  if (!byCity.has(row.cityId)) {
    byCity.set(row.cityId, { label: row.cityLabel, ok: 0, partial: 0, missing: 0 });
  }
  const months = monthCountByDistrict.get(row.regionKey)?.size ?? 0;
  const bucket = byCity.get(row.cityId);
  if (months >= EXPECTED_MONTHS) bucket.ok += 1;
  else if (months > 0) bucket.partial += 1;
  else bucket.missing += 1;
}

console.log("\n=== 시·도별 ===");
for (const city of DEMAND_REGION_REGISTRY) {
  if (EXCLUDE_CITIES.has(city.id)) continue;
  const b = byCity.get(city.id);
  if (!b) continue;
  const status =
    b.missing > 0 ? "❌ 미수집 있음" : b.partial > 0 ? "⚠️ 부분" : "✅ 완료";
  const cityMonths = monthCountByCity.get(city.id)?.size ?? 0;
  console.log(
    `${status} ${b.label}: 구 ${b.ok}/${city.districts.length} 완료` +
      (b.partial ? ` · 부분 ${b.partial}` : "") +
      (b.missing ? ` · 없음 ${b.missing}` : "") +
      ` · city행 ${cityMonths}개월`
  );
}

if (missing.length) {
  console.log("\n=== 미수집 시군구 ===");
  for (const m of missing) {
    console.log(`  ${m.cityLabel} ${m.gu} (${m.regionKey})`);
  }
}

if (partial.length) {
  console.log("\n=== 부분 수집 (<36개월) ===");
  for (const p of partial.slice(0, 30)) {
    console.log(`  ${p.cityLabel} ${p.gu}: ${p.months}개월 ${p.range ?? ""}`);
  }
  if (partial.length > 30) console.log(`  ... 외 ${partial.length - 30}곳`);
}

/** 경남 상세 */
console.log("\n=== 경상남도 상세 ===");
const gyeongnam = expected.filter((e) => e.cityId === "gyeongnam");
for (const row of gyeongnam) {
  const months = monthCountByDistrict.get(row.regionKey);
  const n = months?.size ?? 0;
  const sorted = months ? [...months].sort() : [];
  console.log(
    `  ${row.gu}: ${n}개월` +
      (sorted.length ? ` (${sorted[0]}~${sorted.at(-1)})` : " — DB 없음")
  );
}
console.log("  city:gyeongnam:", monthCountByCity.get("gyeongnam")?.size ?? 0, "개월");

/** 경기도 (미완료 예상) */
console.log("\n=== 경기도 (참고 — 백필 미완료 가능) ===");
const gyeonggiExpected = DEMAND_REGION_REGISTRY.find((c) => c.id === "gyeonggi");
if (gyeonggiExpected) {
  let ggOk = 0;
  let ggPartial = 0;
  let ggMissing = 0;
  for (const d of gyeonggiExpected.districts) {
    const k = districtKey("gyeonggi", d.slug);
    const n = monthCountByDistrict.get(k)?.size ?? 0;
    if (n >= EXPECTED_MONTHS) ggOk += 1;
    else if (n > 0) ggPartial += 1;
    else ggMissing += 1;
  }
  console.log(
    `  구 ${ggOk}/${gyeonggiExpected.districts.length} 완료 · 부분 ${ggPartial} · 없음 ${ggMissing} · city ${monthCountByCity.get("gyeonggi")?.size ?? 0}개월`
  );
}

/** 전국 합산 */
const { data: natRows } = await supabase
  .from("demand_rtms_monthly")
  .select("yyyymm")
  .eq("region_scope", "national")
  .eq("region_key", "kr");
console.log("\n=== 전국(national:kr) ===", natRows?.length ?? 0, "개월");
if ((natRows?.length ?? 0) < EXPECTED_MONTHS) {
  console.log("  ⚠️ 전국 합산 갱신(백필 18단계) 미완료 가능");
}

/** DB에 있지만 레지스트리에 없는 district 키 (오타·구버전) */
const expectedKeys = new Set(expected.map((e) => e.regionKey));
const orphanKeys = [...monthCountByDistrict.keys()].filter((k) => {
  const cityId = k.split(":")[0];
  if (EXCLUDE_CITIES.has(cityId)) return false;
  return !expectedKeys.has(k);
});
if (orphanKeys.length) {
  console.log("\n=== 레지스트리에 없는 district region_key (잔존 데이터?) ===");
  for (const k of orphanKeys.sort()) {
    console.log(`  ${k}: ${monthCountByDistrict.get(k)?.size ?? 0}개월`);
  }
}
