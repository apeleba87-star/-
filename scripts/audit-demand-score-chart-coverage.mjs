#!/usr/bin/env node
/** 입주 예상 점수(지역수요점수) 1년 차트 — 지역별 월별 포인트 수 집계 */

import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const SIGNAL_LAG = 1;

function shiftYyyymm(yyyymm, delta) {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function medianPositive(values) {
  const sorted = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function rtmsActivity(p) {
  return p.jeonse_count * 0.7 + p.sale_count * 0.3;
}

function momPercent(curr, prev) {
  if (!prev || prev <= 0) return 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function normIndex100(value, baseline) {
  if (!value || !baseline) return 100;
  return Math.round((value / baseline) * 1000) / 10;
}

function baselineForMonth(map, signalYm, window = 12) {
  const months = [...map.keys()].filter((ym) => ym <= signalYm).sort();
  const windowMonths = months.slice(-window);
  const med = medianPositive(windowMonths.map((ym) => map.get(ym) ?? 0));
  return med > 0 ? med : map.get(signalYm) ?? 0;
}

function buildNationalSignal(signalYm, packingVol, moveInVol, packingIdx, moveInIdx) {
  const pv = packingVol.get(signalYm);
  const mv = moveInVol.get(signalYm);
  const pi = packingIdx.get(signalYm);
  const mi = moveInIdx.get(signalYm);
  if (pv == null && mv == null && pi == null && mi == null) return null;
  const w = 0.25;
  const composite =
    normIndex100(pv ?? 0, baselineForMonth(packingVol, signalYm)) * w +
    normIndex100(mv ?? 0, baselineForMonth(moveInVol, signalYm)) * w +
    normIndex100(pi ?? 0, baselineForMonth(packingIdx, signalYm)) * w +
    normIndex100(mi ?? 0, baselineForMonth(moveInIdx, signalYm)) * w;
  return Math.round(composite * 10) / 10;
}

function buildRegionalSignal(signalYm, series, districtMedian) {
  const sorted = [...series].sort((a, b) => a.yyyymm.localeCompare(b.yyyymm));
  const idx = sorted.findIndex((p) => p.yyyymm === signalYm);
  if (idx < 0) return null;
  const cur = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const saleMom = prev ? momPercent(cur.sale_count, prev.sale_count) : 0;
  const jeonseMom = prev ? momPercent(cur.jeonse_count, prev.jeonse_count) : 0;
  const level = normIndex100(rtmsActivity(cur), districtMedian);
  const mom = jeonseMom * 0.7 + saleMom * 0.3;
  return Math.round((level * 0.7 + mom * 0.3) * 10) / 10;
}

function scorePointsForRegion(rtmsSeries, nationalMaps, districtMedianByYm) {
  const points = [];
  for (const signalYm of rtmsSeries.map((p) => p.yyyymm)) {
    const nat = buildNationalSignal(
      signalYm,
      nationalMaps.packingVol,
      nationalMaps.moveInVol,
      nationalMaps.packingIdx,
      nationalMaps.moveInIdx
    );
    if (!nat) continue;
    const reg = buildRegionalSignal(
      signalYm,
      rtmsSeries,
      districtMedianByYm.get(signalYm) ?? 0
    );
    if (!reg) continue;
    const targetYm = shiftYyyymm(signalYm, SIGNAL_LAG);
    points.push({ targetYm, signalYm, score: Math.round((nat * reg) / 100 * 10) / 10 });
  }
  return points;
}

// National keyword — searchad monthly volume
const { data: kwRows } = await supabase
  .from("demand_keyword_monthly")
  .select("keyword_key, yyyymm, search_volume_month, source, region_scope, search_phrase")
  .eq("region_scope", "national")
  .eq("region_key", "kr");

// National datalab monthly index (stored in demand_keyword_daily, source=datalab_month)
const { data: datalabMonthRows } = await supabase
  .from("demand_keyword_daily")
  .select("keyword_key, period_date, index_ratio, source")
  .eq("region_scope", "national")
  .eq("region_key", "kr")
  .eq("source", "datalab_month");

const packingVol = new Map();
const moveInVol = new Map();
const packingIdx = new Map();
const moveInIdx = new Map();

for (const r of kwRows ?? []) {
  const ym = r.yyyymm;
  if (r.keyword_key === "packing") {
    if (r.search_volume_month != null)
      packingVol.set(ym, (packingVol.get(ym) ?? 0) + r.search_volume_month);
  }
  if (r.keyword_key === "move_in_clean") {
    if (r.search_volume_month != null)
      moveInVol.set(ym, (moveInVol.get(ym) ?? 0) + r.search_volume_month);
  }
}

for (const r of datalabMonthRows ?? []) {
  const ym = String(r.period_date).slice(0, 7);
  const v = Number(r.index_ratio ?? 0);
  if (r.keyword_key === "packing") packingIdx.set(ym, (packingIdx.get(ym) ?? 0) + v);
  if (r.keyword_key === "move_in_clean") moveInIdx.set(ym, (moveInIdx.get(ym) ?? 0) + v);
}

const natMonths = [
  ...new Set([
    ...packingVol.keys(),
    ...moveInVol.keys(),
    ...packingIdx.keys(),
    ...moveInIdx.keys(),
  ]),
].sort();

console.log("=== 전국 검색 월별 데이터 ===");
console.log("searchad volume months:", [...packingVol.keys()].sort().join(", ") || "(없음)");
console.log("datalab index months:", [...packingIdx.keys()].sort().join(", ") || "(없음)");
console.log("겹치는 signal 월(4종 중 1개+):", natMonths.length);
console.log("범위:", natMonths[0] ?? "-", "~", natMonths.at(-1) ?? "-");
console.log("월 목록:", natMonths.join(", "));

// RTMS district series (paginated — Supabase default limit 1000)
const byDistrict = new Map();
let rtmsFrom = 0;
const rtmsPage = 1000;
while (true) {
  const { data, error } = await supabase
    .from("demand_rtms_monthly")
    .select("region_key, yyyymm, sale_count, jeonse_count")
    .eq("region_scope", "district")
    .order("region_key")
    .order("yyyymm")
    .range(rtmsFrom, rtmsFrom + rtmsPage - 1);
  if (error) throw error;
  if (!data?.length) break;
  for (const r of data) {
    const key = r.region_key;
    if (!byDistrict.has(key)) byDistrict.set(key, []);
    byDistrict.get(key).push(r);
  }
  if (data.length < rtmsPage) break;
  rtmsFrom += rtmsPage;
}

const { data: rtmsRows } = { data: [...byDistrict.values()].flat() };

// district median activity per month (all districts)
const allMonths = [...new Set((rtmsRows ?? []).map((r) => r.yyyymm))].sort();
const districtMedianByYm = new Map();
for (const ym of allMonths) {
  const acts = [];
  for (const series of byDistrict.values()) {
    const pt = series.find((p) => p.yyyymm === ym);
    if (pt) acts.push(rtmsActivity(pt));
  }
  districtMedianByYm.set(ym, medianPositive(acts));
}

const nationalMaps = { packingVol, moveInVol, packingIdx, moveInIdx };

let chartOk = 0;
let chartMissing = 0;
let rtmsOnly1 = 0;
let rtmsManyNatFew = 0;
const missingSamples = [];
const okSamples = [];

for (const [regionKey, series] of byDistrict) {
  const rtmsMonths = series.length;
  const points = scorePointsForRegion(series, nationalMaps, districtMedianByYm);
  if (points.length >= 2) {
    chartOk++;
    if (okSamples.length < 5) okSamples.push({ regionKey, rtmsMonths, scoreMonths: points.length });
  } else {
    chartMissing++;
    if (points.length === 0 && rtmsMonths >= 2) rtmsManyNatFew++;
    if (rtmsMonths <= 1) rtmsOnly1++;
    if (missingSamples.length < 8)
      missingSamples.push({
        regionKey,
        rtmsMonths,
        scoreMonths: points.length,
        rtmsRange: `${series[0]?.yyyymm}~${series.at(-1)?.yyyymm}`,
      });
  }
}

console.log("\n=== 지역(시군구) 입주 예상 점수 차트 커버리지 ===");
console.log("총 시군구 RTMS 보유:", byDistrict.size);
console.log("차트 표시 가능 (점수 2개월+):", chartOk);
console.log("차트 없음 (점수 1개월 이하):", chartMissing);
console.log("  └ RTMS 자체 1개월 이하:", rtmsOnly1);
console.log("  └ RTMS 2개월+ but 점수<2 (전국 검색 월 부족):", rtmsManyNatFew);

console.log("\n차트 OK 샘플:", okSamples);
console.log("\n차트 없음 샘플:", missingSamples);

// Kimhae check
const gimhaeKey = "gyeongnam:gimhaesi-si";
if (byDistrict.has(gimhaeKey)) {
  const pts = scorePointsForRegion(byDistrict.get(gimhaeKey), nationalMaps, districtMedianByYm);
  console.log(
    "\n=== 김해 ===",
    gimhaeKey,
    "RTMS",
    byDistrict.get(gimhaeKey).length,
    "개월, 점수",
    pts.length
  );
  console.log(pts.slice(-5));
} else {
  console.log("\n=== 김해 === DB에 RTMS 없음");
}

const gyeongnamKeys = [...byDistrict.keys()].filter((k) => k.startsWith("gyeongnam:"));
console.log("\n=== 경남 시군구 RTMS 보유 ===", gyeongnamKeys.length, "개");

const seoulKeys = [...byDistrict.keys()].filter((k) => k.startsWith("seoul:"));
console.log("=== 서울 시군구 RTMS 보유 ===", seoulKeys.length, "개");

const { count: totalDistrictRows } = await supabase
  .from("demand_rtms_monthly")
  .select("*", { count: "exact", head: true })
  .eq("region_scope", "district");
console.log("\n=== DB 전체 district RTMS row count ===", totalDistrictRows);
