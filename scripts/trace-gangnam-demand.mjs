/**
 * 강남구 demand 신호 trace — node scripts/trace-gangnam-demand.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  const out = {};
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[t.slice(0, i).trim()] = v;
    }
  }
  return out;
}

const PACKING = ["포장이사", "이사업체", "포장이사견적", "이삿집센터"];
const MOVE_IN = ["입주청소", "입주청소업체", "이사청소", "입주청소비용"];

function momPercent(curr, prev) {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev <= 0) return 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function momFromSeries(byMonth) {
  const months = [...byMonth.keys()].sort();
  if (months.length < 2) return null;
  const prev = byMonth.get(months[months.length - 2]) ?? 0;
  const curr = byMonth.get(months[months.length - 1]) ?? 0;
  if (prev <= 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function trendFromMom(mom) {
  if (mom == null || !Number.isFinite(mom)) return "flat";
  if (mom > 0) return "up";
  if (mom < 0) return "down";
  return "flat";
}

function rtmsTrend(saleMom, jeonseMom) {
  const sale = trendFromMom(saleMom);
  const jeon = trendFromMom(jeonseMom);
  if (sale === "up" && jeon === "up") return "up";
  if (sale === "down" && jeon === "down") return "down";
  if (sale === "up" || jeon === "up") return "up";
  if (sale === "down" || jeon === "down") return "down";
  return "flat";
}

function rtmsStrongUp(saleMom, jeonseMom) {
  return (saleMom > 5 && jeonseMom > 5) || saleMom > 15 || jeonseMom > 15;
}

function sumBasket(rows, phrases) {
  const byMonth = new Map();
  for (const r of rows) {
    if (!phrases.includes(r.search_phrase)) continue;
    const vol =
      r.search_volume_below_ten || r.search_volume_month == null ? 0 : Number(r.search_volume_month);
    byMonth.set(r.yyyymm, (byMonth.get(r.yyyymm) ?? 0) + vol);
  }
  return byMonth;
}

function computeOutlook({ saleMom, jeonseMom, packingMom, moveInMom }) {
  const moveIn = trendFromMom(moveInMom);
  const packing = trendFromMom(packingMom);
  const rtms = rtmsTrend(saleMom, jeonseMom);
  let outlook = "neutral";
  const reasons = [];

  if (packing === "up" && rtms === "down" && moveIn === "down") {
    outlook = "low";
    reasons.push("포장이사 Basket ↑, 거래·입주청소는 약함");
  } else if (moveIn === "up" && (rtms === "up" || packing === "up")) {
    outlook = "rising";
    if (moveIn === "up") reasons.push("입주청소 Basket ↑");
    if (rtms === "up") reasons.push("매매·전월세 거래 ↑");
    if (packing === "up") reasons.push("포장이사 Basket ↑");
  } else if (rtmsStrongUp(saleMom, jeonseMom) && packing === "up" && (moveIn === "down" || moveIn === "flat")) {
    outlook = "watch";
    reasons.push("거래·포장이사 관심 ↑, 입주청소 Basket은 아직 약함");
  } else {
    if (rtms === "up") reasons.push("거래 일부 ↑");
    if (packing === "up") reasons.push("포장이사 Basket ↑");
    if (moveIn === "up") reasons.push("입주청소 Basket ↑");
    if (reasons.length === 0) reasons.push("신호가 뚜렷하지 않음");
  }
  reasons.push("검색 신호는 전국 Basket 기준");
  return { outlook, reasons, signals: { moveIn, rtms, packing } };
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}

const supabase = createClient(url, key);
const DISTRICT_RTMS_KEY = "gangnam-gu";
const DISTRICT_KW_KEY = "seoul:gangnam-gu";

const [rtmsRes, nationalMonthly, districtMonthly, districtDaily] = await Promise.all([
  supabase
    .from("demand_rtms_monthly")
    .select("yyyymm, sale_count, jeonse_count")
    .eq("region_scope", "district")
    .eq("region_key", DISTRICT_RTMS_KEY)
    .order("yyyymm", { ascending: false })
    .limit(6),
  supabase
    .from("demand_keyword_monthly")
    .select("search_phrase, yyyymm, search_volume_month, search_volume_below_ten, keyword_key")
    .eq("source", "searchad")
    .eq("region_scope", "national")
    .eq("region_key", "kr")
    .order("yyyymm", { ascending: true }),
  supabase
    .from("demand_keyword_monthly")
    .select("search_phrase, yyyymm, search_volume_month, search_volume_below_ten, keyword_key")
    .eq("source", "searchad")
    .eq("region_scope", "district")
    .eq("region_key", DISTRICT_KW_KEY)
    .order("yyyymm", { ascending: true }),
  supabase
    .from("demand_keyword_daily")
    .select("keyword_key, period_date, index_ratio, source")
    .eq("region_scope", "district")
    .eq("region_key", DISTRICT_KW_KEY)
    .order("period_date", { ascending: false })
    .limit(5),
]);

console.log("=== 강남구 (gangnam-gu) Demand Trace ===\n");

// RTMS
const rtms = rtmsRes.data ?? [];
console.log("## 1. RTMS 실거래 (구별 live)");
if (rtms.length === 0) {
  console.log("  (데이터 없음 — 더미 fallback 사용)\n");
} else {
  for (const r of [...rtms].reverse()) {
    console.log(
      `  ${r.yyyymm}: 매매 ${Number(r.sale_count).toLocaleString()}건 · 전월세 ${Number(r.jeonse_count).toLocaleString()}건`
    );
  }
  const curr = rtms[0];
  const prev = rtms[1];
  const saleMom = momPercent(Number(curr?.sale_count ?? 0), Number(prev?.sale_count ?? 0));
  const jeonseMom = momPercent(Number(curr?.jeonse_count ?? 0), Number(prev?.jeonse_count ?? 0));
  console.log(`\n  → 최신 MoM (${curr?.yyyymm} vs ${prev?.yyyymm}): 매매 ${saleMom}% · 전월세 ${jeonseMom}%`);
  console.log(`  → rtmsTrend: ${rtmsTrend(saleMom, jeonseMom)} · strongUp: ${rtmsStrongUp(saleMom, jeonseMom)}`);

  const natRows = nationalMonthly.data ?? [];
  const distRows = districtMonthly.data ?? [];
  const packingNat = sumBasket(natRows.filter((r) => r.keyword_key === "packing"), PACKING);
  const moveInNat = sumBasket(natRows.filter((r) => r.keyword_key === "move_in_clean"), MOVE_IN);
  const distPackingNat = sumBasket(distRows.filter((r) => r.keyword_key === "packing"), ["강남구포장이사"]);
  const distMoveInNat = sumBasket(distRows.filter((r) => r.keyword_key === "move_in_clean"), ["강남구입주청소"]);

  const useNationalProxy =
    [...packingNat.keys()].length >= 2 || [...moveInNat.keys()].length >= 2;

  let packingSeries = distPackingNat;
  let moveInSeries = distMoveInNat;
  let searchProxyNational = false;
  if (useNationalProxy) {
    packingSeries = packingNat;
    moveInSeries = moveInNat;
    searchProxyNational = true;
  }

  let packingMom = momFromSeries(packingSeries);
  let moveInMom = momFromSeries(moveInSeries);

  // DataLab fallback (same as outlookFromScopeSignals)
  const dailyAll = await supabase
    .from("demand_keyword_daily")
    .select("keyword_key, period_date, index_ratio, source")
    .eq("region_scope", "district")
    .eq("region_key", DISTRICT_KW_KEY)
    .in("source", ["datalab", "naver_trend"])
    .order("period_date", { ascending: true })
    .limit(500);
  const dailyRows = dailyAll.data ?? [];
  function momFromDaily(keywordKey) {
    const rows = dailyRows
      .filter((r) => r.keyword_key === keywordKey)
      .map((r) => ({ periodDate: String(r.period_date).slice(0, 10), indexRatio: Number(r.index_ratio) }));
    if (rows.length < 14) return null;
    const sorted = rows.sort((a, b) => a.periodDate.localeCompare(b.periodDate));
    const recent = sorted.slice(-30);
    const prior = sorted.slice(-60, -30);
    if (!recent.length || !prior.length) return null;
    const avgRecent = recent.reduce((s, r) => s + r.indexRatio, 0) / recent.length;
    const avgPrior = prior.reduce((s, r) => s + r.indexRatio, 0) / prior.length;
    if (avgPrior <= 0) return null;
    return Math.round(((avgRecent - avgPrior) / avgPrior) * 1000) / 10;
  }
  const packingIndexMom = momFromDaily("packing");
  const moveInIndexMom = momFromDaily("move_in_clean");
  if (packingMom == null) packingMom = packingIndexMom;
  if (moveInMom == null) moveInMom = moveInIndexMom;

  console.log("\n## 2. 검색 Basket (판단용)");
  console.log(
    `  전국 proxy: ${searchProxyNational ? "예" : "아니오 (전국 1개월 < 2 → 구별 series 시도, 역시 1개월)"}`
  );
  console.log(`  전국 DB: ${new Set(natRows.map((r) => r.yyyymm)).size}개월 · ${natRows.length}행 · phrase ${new Set(natRows.map((r) => r.search_phrase)).size}/8`);
  console.log("  전국 포장 Basket 합:");
  for (const [m, v] of [...packingNat.entries()].sort()) console.log(`    ${m}: ${v.toLocaleString()}`);
  console.log("  전국 입주 Basket 합:");
  for (const [m, v] of [...moveInNat.entries()].sort()) console.log(`    ${m}: ${v.toLocaleString()}`);
  console.log(`  Basket MoM: packing ${momFromSeries(packingSeries) ?? "null"} · moveIn ${momFromSeries(moveInSeries) ?? "null"}`);
  console.log(`  DataLab fallback MoM: packing ${packingIndexMom ?? "null"} · moveIn ${moveInIndexMom ?? "null"}`);
  console.log(`  → 판단에 쓰는 MoM: packing ${packingMom ?? "null"} · moveIn ${moveInMom ?? "null"}`);

  console.log("\n## 3. 구별 SearchAd (표·검색량 표시)");
  if (distRows.length === 0) console.log("  (없음)");
  else {
    for (const r of distRows) {
      const vol = r.search_volume_below_ten ? "<10" : r.search_volume_month;
      console.log(`  ${r.yyyymm} ${r.search_phrase}: ${vol}`);
    }
  }

  console.log("\n## 4. DataLab 구별 지수 (보조)");
  const daily = districtDaily.data ?? [];
  if (daily.length === 0) console.log("  (최근 일별 없음)");
  else daily.forEach((r) => console.log(`  ${r.period_date} ${r.keyword_key} idx=${r.index_ratio} (${r.source})`));

  const result = computeOutlook({ saleMom, jeonseMom, packingMom, moveInMom });
  if (searchProxyNational && result.outlook !== "neutral") {
    result.reasons.push("검색 신호는 전국 Basket 기준");
  }
  console.log("\n## 5. Outlook 결과");
  console.log(`  판단: ${result.outlook}`);
  console.log(`  신호: RTMS=${result.signals.rtms} · packing=${result.signals.packing} · moveIn=${result.signals.moveIn}`);
  console.log(`  근거: ${result.reasons.join(" · ")}`);

  // Composite rough
  const clamp = (v) => Math.max(-35, Math.min(35, v ?? 0));
  const composite =
    100 +
    clamp(packingMom) * 0.3 +
    clamp(jeonseMom) * 0.25 +
    clamp(saleMom) * 0.2 +
    clamp(moveInMom) * 0.25;
  console.log(`\n## 6. 입주 온도 (참고): ${Math.round(Math.max(50, Math.min(160, composite)))}`);
}
