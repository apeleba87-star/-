#!/usr/bin/env node
/** 고양 덕양구 입주 예상 점수 — 산식·구간 검증 */

import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const REGION_KEY = "gyeonggi:goya-deogyagu-gu";
const SIGNAL_LAG = 1;
const BASELINE_MONTHS = 12;
const HEAT = { veryHot: 160, hot: 140, rising: 120, normal: 100 };
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

function heatBandAbsolute(score) {
  if (score >= HEAT.veryHot) return "very_hot (매우 뜨거움)";
  if (score >= HEAT.hot) return "hot (뜨거움)";
  if (score >= HEAT.rising) return "rising (상승)";
  if (score >= HEAT.normal) return "normal (보통)";
  return "weak (약함)";
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
  if (percentile >= HEAT_PCT.veryHot) band = "very_hot (매우 뜨거움)";
  else if (percentile >= HEAT_PCT.hot) band = "hot (뜨거움)";
  else if (percentile >= HEAT_PCT.rising) band = "rising (상승)";
  else if (percentile >= HEAT_PCT.normal) band = "normal (보통)";
  else band = "weak (약함)";
  return { band, relative: true, percentile, historyMonths: benchmark.length };
}

function buildNationalSignal(signalYm, packingVol, moveInVol, packingIdx, moveInIdx) {
  const w = 0.25;
  const pv = packingVol.get(signalYm);
  const mv = moveInVol.get(signalYm);
  const pi = packingIdx.get(signalYm);
  const mi = moveInIdx.get(signalYm);
  if (pv == null && mv == null && pi == null && mi == null) return null;

  const packingVolumeIndex = normIndex100(pv ?? 0, baselineForMonth(packingVol, signalYm));
  const moveInVolumeIndex = normIndex100(mv ?? 0, baselineForMonth(moveInVol, signalYm));
  const packingSearchIndex = normIndex100(pi ?? 0, baselineForMonth(packingIdx, signalYm));
  const moveInSearchIndex = normIndex100(mi ?? 0, baselineForMonth(moveInIdx, signalYm));
  const composite = Math.round(
    (packingVolumeIndex * w +
      moveInVolumeIndex * w +
      packingSearchIndex * w +
      moveInSearchIndex * w) *
      10
  ) / 10;

  return {
    signalYm,
    packingVolumeIndex,
    moveInVolumeIndex,
    packingSearchIndex,
    moveInSearchIndex,
    composite,
  };
}

function rtmsMomentumIndex(saleMom, jeonseMom) {
  const changePct = Math.round((jeonseMom * 0.7 + saleMom * 0.3) * 10) / 10;
  return Math.round((100 + changePct) * 10) / 10;
}

function buildRegionalSignal(signalYm, series, districtMedian) {
  const sorted = [...series].sort((a, b) => a.yyyymm.localeCompare(b.yyyymm));
  const idx = sorted.findIndex((p) => p.yyyymm === signalYm);
  if (idx < 0) return null;
  const cur = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const saleMom = prev ? momPercent(cur.sale_count, prev.sale_count) : 0;
  const jeonseMom = prev ? momPercent(cur.jeonse_count, prev.jeonse_count) : 0;
  const act = rtmsActivity(cur.sale_count, cur.jeonse_count);
  const level = normIndex100(act, districtMedian);
  const momIdx = rtmsMomentumIndex(saleMom, jeonseMom);
  const composite = Math.round((level * 0.7 + momIdx * 0.3) * 10) / 10;
  return {
    signalYm,
    saleCount: cur.sale_count,
    jeonseCount: cur.jeonse_count,
    saleMom,
    jeonseMom,
    rtmsActivity: act,
    districtMedian,
    rtmsLevelIndex: level,
    rtmsMomentumIndex: momIdx,
    composite,
  };
}

function scoreForRegion(regionKey, rtmsSeries, nationalMaps, districtMedianByYm, targetYm, signalYm) {
  const nat = buildNationalSignal(
    signalYm,
    nationalMaps.packingVol,
    nationalMaps.moveInVol,
    nationalMaps.packingIdx,
    nationalMaps.moveInIdx
  );
  if (!nat) return null;
  const reg = buildRegionalSignal(
    signalYm,
    rtmsSeries,
    districtMedianByYm.get(signalYm) ?? 0
  );
  if (!reg) return null;
  const score = Math.round((nat.composite * reg.composite) / 100 * 10) / 10;
  return { targetYm, signalYm, score, national: nat, regional: reg };
}

// National keyword
const { data: kwRows } = await supabase
  .from("demand_keyword_monthly")
  .select("keyword_key, yyyymm, search_volume_month, source, region_scope")
  .eq("region_scope", "national")
  .eq("region_key", "kr");

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

// All district RTMS
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

const today = new Date();
const targetYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const idealSignal = shiftYyyymm(targetYm, -SIGNAL_LAG);

const deogyangSeries = byDistrict.get(REGION_KEY);
if (!deogyangSeries?.length) {
  console.error("덕양구 RTMS 없음");
  process.exit(1);
}

const latestRtms = deogyangSeries.at(-1).yyyymm;
const signalYm = idealSignal <= latestRtms ? idealSignal : latestRtms;

const result = scoreForRegion(
  REGION_KEY,
  deogyangSeries,
  nationalMaps,
  districtMedianByYm,
  targetYm,
  signalYm
);

console.log("=== 고양시 덕양구 입주 예상 점수 검증 ===");
console.log("region_key:", REGION_KEY);
console.log("대상월(카드):", targetYm, "| 신호월:", signalYm);
console.log("RTMS 최신월:", latestRtms);
console.log("");

if (!result) {
  console.error("계산 실패 — 검색·RTMS 겹치는 월 없음");
  process.exit(1);
}

console.log("【최종 점수】", result.score, "→ 절대:", heatBandAbsolute(result.score));

const deogyangHistory = [];
for (const ym of allMonths) {
  const target = shiftYyyymm(ym, SIGNAL_LAG);
  const r = scoreForRegion(
    REGION_KEY,
    deogyangSeries,
    nationalMaps,
    districtMedianByYm,
    target,
    ym
  );
  if (r && target !== targetYm) deogyangHistory.push(r.score);
}
const benchmark = deogyangHistory.slice(-HEAT_WINDOW);
const rel = heatBandRelative(result.score, benchmark);
console.log(
  "【지역 그래프 기준 라벨】",
  rel.band,
  rel.relative
    ? `(백분위 ${rel.percentile}, 벤치마크 ${rel.historyMonths}개월)`
    : `(벤치마크 ${rel.historyMonths}개월 — 절대 폴백)`
);
console.log("");
console.log("【전국 신호 composite】", result.national.composite);
console.log("  포장 검색량 지수:", result.national.packingVolumeIndex);
console.log("  입주청소 검색량 지수:", result.national.moveInVolumeIndex);
console.log("  포장 검색지수:", result.national.packingSearchIndex);
console.log("  입주청소 검색지수:", result.national.moveInSearchIndex);
console.log("");
console.log("【지역 RTMS composite】", result.regional.composite);
console.log("  전월세", result.regional.jeonseCount, "건 (MoM", result.regional.jeonseMom + "%)");
console.log("  매매", result.regional.saleCount, "건 (MoM", result.regional.saleMom + "%)");
console.log("  RTMS 활동량:", Math.round(result.regional.rtmsActivity * 10) / 10);
console.log("  전국 시군구 중앙:", Math.round(result.regional.districtMedian * 10) / 10);
console.log("  규모(level) 지수:", result.regional.rtmsLevelIndex);
console.log("  모멘텀(mom) 지수:", result.regional.rtmsMomentumIndex);
console.log("");
console.log(
  "산식:",
  `${result.national.composite} × ${result.regional.composite} / 100 = ${result.score}`
);

// Card display month (RTMS snapshot - often signal month data shown as "current trade")
const snap = deogyangSeries.find((p) => p.yyyymm === signalYm);
if (snap) {
  const prev = deogyangSeries[deogyangSeries.findIndex((p) => p.yyyymm === signalYm) - 1];
  console.log("");
  console.log("【UI 거래 카드 (신호월 RTMS)】");
  console.log("  전월세:", snap.jeonse_count, "건", prev ? `(MoM ${momPercent(snap.jeonse_count, prev.jeonse_count)}%)` : "");
  console.log("  매매:", snap.sale_count, "건", prev ? `(MoM ${momPercent(snap.sale_count, prev.sale_count)}%)` : "");
}

// Nationwide rank
const scores = [];
for (const [key, series] of byDistrict) {
  for (const signal of [signalYm]) {
    const r = scoreForRegion(key, series, nationalMaps, districtMedianByYm, targetYm, signal);
    if (r) scores.push({ key, score: r.score });
  }
}
scores.sort((a, b) => b.score - a.score);
const rank = scores.findIndex((s) => s.key === REGION_KEY) + 1;
const pct = rank > 0 ? Math.round((rank / scores.length) * 1000) / 10 : null;

console.log("");
console.log("【전국 순위】", rank, "/", scores.length, `(상위 ${pct}%)`);
console.log("구간 기준: veryHot≥160, hot≥140, rising≥120, normal≥100");
console.log("");
console.log("상위 5:", scores.slice(0, 5).map((s) => `${s.key} ${s.score}`).join("\n         "));
console.log("덕양 근처:", scores.filter((s) => s.key.includes("gyeonggi")).slice(0, 8).map((s) => `${s.key} ${s.score}`).join("\n         "));

// Is "very hot" appropriate given negative search indices on card?
console.log("");
console.log("【매우 뜨거움 적절성】");
console.log(
  "- 점수는 전국검색×지역RTMS 곱 — 검색지수 하락은 전국 composite에 반영됨.",
  "덕양은 RTMS '규모(level)'가 전국 중앙 대비 높으면 regional composite가 크게 나옴."
);
if (result.regional.rtmsLevelIndex > 150 && result.national.moveInSearchIndex < 100) {
  console.log(
    "- 전형적 패턴: 입주청소 검색↓(전국) + RTMS 거래량↑(지역) → 점수는 RTMS 규모에 끌려 올라갈 수 있음."
  );
}
