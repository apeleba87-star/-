#!/usr/bin/env node
/** 전국 입주 예상 점수·지역 그래프 heat band 일괄 검증 */

import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const SIGNAL_LAG = 1;
const BASELINE_MONTHS = 12;
const HEAT_PCT = { veryHot: 90, hot: 75, rising: 50, normal: 25 };
const HEAT_MIN_HISTORY = 6;
const HEAT_WINDOW = 24;

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function shiftYyyymm(yyyymm, delta) {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getKstTargetYyyymm() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}`;
}

function medianPositive(values) {
  const sorted = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function rtmsActivity(sale, jeonse) {
  return jeonse * 0.7 + sale * 0.3;
}

function momPercent(curr, prev) {
  if (!prev || prev <= 0) return 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function normIndex100(value, baseline) {
  if (!value || !baseline) return 100;
  return Math.round((value / baseline) * 1000) / 10;
}

function baselineForMonth(map, signalYm) {
  const months = [...map.keys()].filter((ym) => ym <= signalYm).sort();
  const windowMonths = months.slice(-BASELINE_MONTHS);
  const med = medianPositive(windowMonths.map((ym) => map.get(ym) ?? 0));
  return med > 0 ? med : map.get(signalYm) ?? 0;
}

function rtmsMomentumIndex(saleMom, jeonseMom) {
  const changePct = Math.round((jeonseMom * 0.7 + saleMom * 0.3) * 10) / 10;
  return Math.round((100 + changePct) * 10) / 10;
}

function buildNationalComposite(signalYm, packingVol, moveInVol, packingIdx, moveInIdx) {
  const pv = packingVol.get(signalYm);
  const mv = moveInVol.get(signalYm);
  const pi = packingIdx.get(signalYm);
  const mi = moveInIdx.get(signalYm);
  if (pv == null && mv == null && pi == null && mi == null) return null;
  const w = 0.25;
  return (
    Math.round(
      (normIndex100(pv ?? 0, baselineForMonth(packingVol, signalYm)) * w +
        normIndex100(mv ?? 0, baselineForMonth(moveInVol, signalYm)) * w +
        normIndex100(pi ?? 0, baselineForMonth(packingIdx, signalYm)) * w +
        normIndex100(mi ?? 0, baselineForMonth(moveInIdx, signalYm)) * w) *
        10
    ) / 10
  );
}

function buildRegionalComposite(signalYm, series, districtMedian) {
  const sorted = [...series].sort((a, b) => a.yyyymm.localeCompare(b.yyyymm));
  const idx = sorted.findIndex((p) => p.yyyymm === signalYm);
  if (idx < 0) return null;
  const cur = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const saleMom = prev ? momPercent(cur.sale_count, prev.sale_count) : 0;
  const jeonseMom = prev ? momPercent(cur.jeonse_count, prev.jeonse_count) : 0;
  const level = normIndex100(rtmsActivity(cur.sale_count, cur.jeonse_count), districtMedian);
  const momIdx = rtmsMomentumIndex(saleMom, jeonseMom);
  return Math.round((level * 0.7 + momIdx * 0.3) * 10) / 10;
}

function scoreForSignal(signalYm, series, nationalMaps, districtMedianByYm) {
  const nat = buildNationalComposite(
    signalYm,
    nationalMaps.packingVol,
    nationalMaps.moveInVol,
    nationalMaps.packingIdx,
    nationalMaps.moveInIdx
  );
  if (nat == null) return null;
  const reg = buildRegionalComposite(
    signalYm,
    series,
    districtMedianByYm.get(signalYm) ?? 0
  );
  if (reg == null) return null;
  const targetYm = shiftYyyymm(signalYm, SIGNAL_LAG);
  const score = Math.round((nat * reg) / 100 * 10) / 10;
  return { targetYm, signalYm, score, nat, reg };
}

function scoreSeriesForRegion(series, nationalMaps, districtMedianByYm) {
  const points = [];
  for (const signalYm of [...series].map((p) => p.yyyymm).sort()) {
    const r = scoreForSignal(signalYm, series, nationalMaps, districtMedianByYm);
    if (r) points.push(r);
  }
  return points;
}

function heatBandAbsolute(score) {
  if (score >= 160) return "very_hot";
  if (score >= 140) return "hot";
  if (score >= 120) return "rising";
  if (score >= 100) return "normal";
  return "weak";
}

function heatBandRelative(current, benchmark) {
  if (benchmark.length < HEAT_MIN_HISTORY) {
    return {
      band: heatBandAbsolute(current),
      relative: false,
      percentile: null,
      historyMonths: benchmark.length,
    };
  }
  const less = benchmark.filter((v) => v < current).length;
  const equal = benchmark.filter((v) => v === current).length;
  const percentile = Math.round(((less + equal / 2) / benchmark.length) * 1000) / 10;
  let band;
  if (percentile >= HEAT_PCT.veryHot) band = "very_hot";
  else if (percentile >= HEAT_PCT.hot) band = "hot";
  else if (percentile >= HEAT_PCT.rising) band = "rising";
  else if (percentile >= HEAT_PCT.normal) band = "normal";
  else band = "weak";
  return { band, relative: true, percentile, historyMonths: benchmark.length };
}

// --- load national keyword ---
const { data: kwRows } = await supabase
  .from("demand_keyword_monthly")
  .select("keyword_key, yyyymm, search_volume_month")
  .eq("region_scope", "national")
  .eq("region_key", "kr");

const { data: datalabMonthRows } = await supabase
  .from("demand_keyword_daily")
  .select("keyword_key, period_date, index_ratio")
  .eq("region_scope", "national")
  .eq("region_key", "kr")
  .eq("source", "datalab_month");

const packingVol = new Map();
const moveInVol = new Map();
const packingIdx = new Map();
const moveInIdx = new Map();

for (const r of kwRows ?? []) {
  const ym = r.yyyymm;
  if (r.keyword_key === "packing" && r.search_volume_month != null) {
    packingVol.set(ym, (packingVol.get(ym) ?? 0) + r.search_volume_month);
  }
  if (r.keyword_key === "move_in_clean" && r.search_volume_month != null) {
    moveInVol.set(ym, (moveInVol.get(ym) ?? 0) + r.search_volume_month);
  }
}

for (const r of datalabMonthRows ?? []) {
  const ym = String(r.period_date).slice(0, 7);
  const v = Number(r.index_ratio ?? 0);
  if (r.keyword_key === "packing") packingIdx.set(ym, (packingIdx.get(ym) ?? 0) + v);
  if (r.keyword_key === "move_in_clean") moveInIdx.set(ym, (moveInIdx.get(ym) ?? 0) + v);
}

const nationalMaps = { packingVol, moveInVol, packingIdx, moveInIdx };

// --- load all district RTMS ---
const byDistrict = new Map();
let from = 0;
while (true) {
  const { data, error } = await supabase
    .from("demand_rtms_monthly")
    .select("region_key, yyyymm, sale_count, jeonse_count")
    .eq("region_scope", "district")
    .order("region_key")
    .order("yyyymm")
    .range(from, from + 999);
  if (error) throw error;
  if (!data?.length) break;
  for (const r of data) {
    if (!byDistrict.has(r.region_key)) byDistrict.set(r.region_key, []);
    byDistrict.get(r.region_key).push(r);
  }
  if (data.length < 1000) break;
  from += 1000;
}

const allMonths = [...new Set([...byDistrict.values()].flat().map((p) => p.yyyymm))].sort();
const districtMedianByYm = new Map();
for (const ym of allMonths) {
  const acts = [];
  for (const series of byDistrict.values()) {
    const pt = series.find((p) => p.yyyymm === ym);
    if (pt) acts.push(rtmsActivity(pt.sale_count, pt.jeonse_count));
  }
  districtMedianByYm.set(ym, medianPositive(acts));
}

const targetYm = getKstTargetYyyymm();
const idealSignal = shiftYyyymm(targetYm, -SIGNAL_LAG);
const latestRtmsYm = allMonths.at(-1) ?? null;
const signalYm = idealSignal <= (latestRtmsYm ?? "") ? idealSignal : latestRtmsYm;

console.log("=== 전국 입주 예상 점수 일괄 검증 ===");
console.log("대상월:", targetYm, "| 신호월:", signalYm, "| RTMS 최신:", latestRtmsYm);
console.log("시군구 수:", byDistrict.size);
console.log("");

const errors = [];
const warnings = [];
const cardRows = [];
const bandCounts = { very_hot: 0, hot: 0, rising: 0, normal: 0, weak: 0 };
const relativeCount = { relative: 0, fallback: 0 };
let chartOk = 0;
let cardOk = 0;
let cardMissing = 0;
let chartCardMismatch = 0;

for (const [regionKey, series] of byDistrict) {
  const points = scoreSeriesForRegion(series, nationalMaps, districtMedianByYm);
  const card = points.find((p) => p.targetYm === targetYm);
  const lastChart = points.at(-1);

  if (points.length >= 2) chartOk++;

  if (!card) {
    cardMissing++;
    if (warnings.length < 10) {
      warnings.push({ type: "no_card", regionKey, points: points.length, rtms: series.length });
    }
    continue;
  }

  cardOk++;

  if (!Number.isFinite(card.score) || card.score <= 0) {
    errors.push({ type: "invalid_score", regionKey, score: card.score });
  }
  if (card.score > 2000) {
    warnings.push({ type: "extreme_score", regionKey, score: card.score });
  }

  // 카드 vs 차트 마지막 포인트 (같은 targetYm이면 일치해야 함)
  if (lastChart && lastChart.targetYm === targetYm) {
    const diff = Math.abs(lastChart.score - card.score);
    if (diff > 0.05) {
      chartCardMismatch++;
      errors.push({
        type: "chart_card_mismatch",
        regionKey,
        card: card.score,
        chart: lastChart.score,
        diff,
      });
    }
  }

  const benchmark = points
    .filter((p) => p.targetYm !== targetYm)
    .map((p) => p.score)
    .slice(-HEAT_WINDOW);
  const heat = heatBandRelative(card.score, benchmark);
  bandCounts[heat.band]++;
  if (heat.relative) relativeCount.relative++;
  else relativeCount.fallback++;

  if (heat.relative && heat.percentile != null && (heat.percentile < 0 || heat.percentile > 100)) {
    errors.push({ type: "bad_percentile", regionKey, percentile: heat.percentile });
  }

  cardRows.push({ regionKey, score: card.score, band: heat.band, heat });
}

cardRows.sort((a, b) => b.score - a.score);

console.log("【카드 점수】");
console.log("  계산 가능:", cardOk, "/", byDistrict.size);
console.log("  계산 불가 (신호월·검색 겹침 없음):", cardMissing);
console.log("  차트 2개월+:", chartOk);

console.log("\n【오류】", errors.length);
if (errors.length) {
  for (const e of errors.slice(0, 20)) console.log(" ", JSON.stringify(e));
  if (errors.length > 20) console.log("  ... 외", errors.length - 20, "건");
}

console.log("\n【경고】", warnings.length);
for (const w of warnings.slice(0, 10)) console.log(" ", JSON.stringify(w));

console.log("\n【지역 그래프 heat band 분포】 (상대:", relativeCount.relative, "/ 폴백:", relativeCount.fallback, ")");
console.log(" ", bandCounts);

console.log("\n【TOP 10】");
for (const r of cardRows.slice(0, 10)) {
  const h = r.heat;
  const heatNote = h.relative ? `p${h.percentile}` : `fallback(${h.historyMonths}m)`;
  console.log(`  ${r.regionKey}  ${r.score}  ${r.band}  ${heatNote}`);
}

console.log("\n【BOTTOM 5】");
for (const r of cardRows.slice(-5)) {
  const h = r.heat;
  const heatNote = h.relative ? `p${h.percentile}` : `fallback(${h.historyMonths}m)`;
  console.log(`  ${r.regionKey}  ${r.score}  ${r.band}  ${heatNote}`);
}

// deogyang spot check
const deogyang = cardRows.find((r) => r.regionKey === "gyeonggi:goya-deogyagu-gu");
if (deogyang) {
  console.log("\n【덕양구】", deogyang.score, deogyang.band, deogyang.heat);
}

const exitCode = errors.length > 0 ? 1 : 0;
console.log(exitCode === 0 ? "\n✓ PASS — 계산 오류 없음" : "\n✗ FAIL — 오류 있음");
process.exit(exitCode);
