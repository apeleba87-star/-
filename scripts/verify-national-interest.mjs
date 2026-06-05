#!/usr/bin/env node
/**
 * 전국 이사관심도 계산 검증 — import VOLUMES와 동일 데이터로 수동 재현
 */
const MONTHS = [
  "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11",
  "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05",
];

const VOLUMES = {
  포장이사: [32163, 35826, 35710, 40680, 36131, 28030, 31865, 44085, 43316, 39000, 33857, 28904],
  이사업체: [8262, 8705, 7991, 7548, 9043, 8580, 10891, 13229, 9163, 10294, 9052, 8726],
  포장이사견적: [2574, 2458, 3699, 4735, 8025, 2636, 3337, 4501, 3453, 5854, 4453, 3600],
  이삿집센터: [715, 718, 717, 385, 175, 170, 205, 370, 652, 692, 590, 584],
  입주청소: [36443, 39603, 39135, 40266, 45180, 57988, 205387, 147010, 138793, 145607, 74800, 81166],
  입주청소업체: [1394, 1666, 4438, 2319, 1466, 1567, 2010, 2435, 1505, 1652, 1425, 1517],
  이사청소: [8522, 8622, 8583, 8062, 8715, 9059, 9145, 11070, 7410, 7362, 6839, 6838],
  입주청소비용: [14171, 14149, 15426, 13859, 12642, 14766, 15214, 18355, 16511, 18427, 15360, 14596],
  "1월손없는날": [0, 0, 0, 217, 2968, 8700, 22415, 32041, 704, 93, 0, 0],
  "2월손없는날": [0, 0, 0, 0, 13, 181, 607, 2411, 2568, 50, 0, 0],
  "3월손없는날": [0, 0, 0, 0, 0, 2, 24, 153, 318, 343, 0, 0],
  "4월손없는날": [0, 0, 0, 0, 0, 0, 432, 6532, 17176, 45737, 41365, 477],
  "5월손없는날": [0, 0, 0, 0, 0, 0, 4, 4363, 16614, 31583, 41798, 0],
  "6월손없는날": [24634, 364, 0, 0, 0, 0, 0, 271, 1528, 7105, 19248, 39422],
  "7월손없는날": [27541, 23403, 373, 0, 0, 0, 0, 0, 475, 1865, 7071, 17262],
  "8월손없는날": [11485, 23106, 22230, 329, 0, 0, 0, 0, 0, 0, 843, 2640],
  "9월손없는날": [5522, 13304, 28769, 27799, 352, 0, 0, 0, 0, 0, 328, 927],
  "10월손없는날": [2100, 5244, 14783, 29728, 24917, 315, 0, 0, 0, 0, 0, 353],
  "11월손없는날": [1515, 3054, 8542, 26008, 50214, 45475, 718, 0, 0, 0, 0, 0],
  "12월손없는날": [452, 784, 1936, 6739, 17052, 33116, 28119, 427, 0, 0, 0, 0],
};

const PACKING = ["포장이사", "이사업체", "포장이사견적", "이삿집센터"];
const MOVE_IN = ["입주청소", "입주청소업체", "이사청소", "입주청소비용"];

function sumBasket(phrases, monthIdx) {
  return phrases.reduce((s, p) => s + (VOLUMES[p][monthIdx] ?? 0), 0);
}

function mom(prev, curr) {
  if (!prev || prev <= 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function handFreePhrasesForSearchMonth(calMonth) {
  const m = ((calMonth - 1) % 12) + 1;
  const next1 = (m % 12) + 1;
  const next2 = ((m + 1) % 12) + 1;
  return [`${next1}월손없는날`, `${next2}월손없는날`];
}

function handFreeForwardSum(monthIdx) {
  const calMonth = Number(MONTHS[monthIdx].split("-")[1]);
  const [p1, p2] = handFreePhrasesForSearchMonth(calMonth);
  return (VOLUMES[p1][monthIdx] ?? 0) + (VOLUMES[p2][monthIdx] ?? 0);
}

/** 영업월 기준 7·8월 (검색월+1 달의 forward window) */
function handFreeBusinessSum(monthIdx) {
  const searchMonth = Number(MONTHS[monthIdx].split("-")[1]);
  const businessMonth = searchMonth >= 12 ? 1 : searchMonth + 1;
  const [p1, p2] = handFreePhrasesForSearchMonth(businessMonth);
  return (VOLUMES[p1][monthIdx] ?? 0) + (VOLUMES[p2][monthIdx] ?? 0);
}

const last = MONTHS.length - 1;
const prev = last - 1;

const packingPrev = sumBasket(PACKING, prev);
const packingCurr = sumBasket(PACKING, last);
const moveInPrev = sumBasket(MOVE_IN, prev);
const moveInCurr = sumBasket(MOVE_IN, last);

const packingMom = mom(packingPrev, packingCurr);
const moveInMom = mom(moveInPrev, moveInCurr);

const hfSearchPrev = handFreeForwardSum(prev);
const hfSearchCurr = handFreeForwardSum(last);
const hfSearchMom = mom(hfSearchPrev, hfSearchCurr);

const hfBizPrev = handFreeBusinessSum(prev);
const hfBizCurr = handFreeBusinessSum(last);
const hfBizMom = mom(hfBizPrev, hfBizCurr);

const coreChangePct = Math.round(((packingMom * 0.4 + moveInMom * 0.3) / 0.7) * 10) / 10;
const index = Math.round((100 + coreChangePct) * 10) / 10;

console.log("=== 최신 2개월 (검색 확정) ===");
console.log(`기준: ${MONTHS[prev]} → ${MONTHS[last]}`);
console.log("");
console.log("포장 Basket 합:");
console.log(`  ${MONTHS[prev]}: ${packingPrev.toLocaleString()} → ${MONTHS[last]}: ${packingCurr.toLocaleString()}  MoM ${packingMom}%`);
console.log("입주 Basket 합:");
console.log(`  ${MONTHS[prev]}: ${moveInPrev.toLocaleString()} → ${MONTHS[last]}: ${moveInCurr.toLocaleString()}  MoM ${moveInMom}%`);
console.log("");
console.log("손없는날 — 현재 코드 (검색월 M → M+1·M+2 phrase):");
const [sp1, sp2] = handFreePhrasesForSearchMonth(Number(MONTHS[last].split("-")[1]));
const [spp1, spp2] = handFreePhrasesForSearchMonth(Number(MONTHS[prev].split("-")[1]));
console.log(`  ${MONTHS[prev]}: ${spp1}+${spp2} = ${hfSearchPrev.toLocaleString()}`);
console.log(`  ${MONTHS[last]}: ${sp1}+${sp2} = ${hfSearchCurr.toLocaleString()}  MoM ${hfSearchMom}%`);
console.log("");
console.log("손없는날 — 영업월 정렬 (검색월+1 달 → 7·8월 phrase, UI 라벨과 동일):");
const bizM = Number(MONTHS[last].split("-")[1]) >= 12 ? 1 : Number(MONTHS[last].split("-")[1]) + 1;
const [bp1, bp2] = handFreePhrasesForSearchMonth(bizM);
console.log(`  영업 참고 ${bizM}월 → ${bp1}+${bp2}`);
console.log(`  ${MONTHS[prev]}: ${hfBizPrev.toLocaleString()} → ${MONTHS[last]}: ${hfBizCurr.toLocaleString()}  MoM ${hfBizMom}%`);
console.log("");
console.log("=== 전국 이사관심도 (본지표: 포장·입주만) ===");
console.log(`  changePct = (${packingMom}×0.4 + ${moveInMom}×0.3) / 0.7 = ${coreChangePct}%`);
console.log(`  index = 100 + ${coreChangePct} = ${index}`);
console.log("");
console.log("=== 손없는날 (보조, 지수 미반영) ===");
console.log(`  forward MoM ${hfSearchMom}% · 영업월 정렬 MoM ${hfBizMom}%`);

// show last 6 months hand-free forward series for intuition
console.log("\n=== 손없는날 forward 시계열 (최근 6개월) ===");
for (let i = Math.max(0, last - 5); i <= last; i++) {
  const m = MONTHS[i];
  const cal = Number(m.split("-")[1]);
  const [a, b] = handFreePhrasesForSearchMonth(cal);
  console.log(`  ${m}: ${a}(${VOLUMES[a][i]}) + ${b}(${VOLUMES[b][i]}) = ${handFreeForwardSum(i).toLocaleString()}`);
}
