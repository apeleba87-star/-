#!/usr/bin/env node
/**
 * 검색광고 콘솔 수동 12개월 → demand_keyword_monthly
 * node scripts/import-demand-searchad-manual.mjs
 */
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

const MONTHS = [
  "2025-06",
  "2025-07",
  "2025-08",
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
];

/** phrase → { keyword_key, region_scope, region_key } */
const TARGETS = {
  포장이사: { keyword_key: "packing", region_scope: "national", region_key: "kr" },
  이사업체: { keyword_key: "packing", region_scope: "national", region_key: "kr" },
  포장이사견적: { keyword_key: "packing", region_scope: "national", region_key: "kr" },
  이삿집센터: { keyword_key: "packing", region_scope: "national", region_key: "kr" },
  입주청소: { keyword_key: "move_in_clean", region_scope: "national", region_key: "kr" },
  입주청소업체: { keyword_key: "move_in_clean", region_scope: "national", region_key: "kr" },
  이사청소: { keyword_key: "move_in_clean", region_scope: "national", region_key: "kr" },
  입주청소비용: { keyword_key: "move_in_clean", region_scope: "national", region_key: "kr" },
  서울포장이사: { keyword_key: "packing", region_scope: "city", region_key: "seoul" },
  서울입주청소: { keyword_key: "move_in_clean", region_scope: "city", region_key: "seoul" },
};

/** 1~12월손없는날 — VOLUMES 채우면 import에 포함 */
const HAND_FREE_META = {
  keyword_key: "move_in_clean",
  region_scope: "national",
  region_key: "kr",
};
for (let m = 1; m <= 12; m += 1) {
  TARGETS[`${m}월손없는날`] = HAND_FREE_META;
}

const VOLUMES = {
  포장이사: [32163, 35826, 35710, 40680, 36131, 28030, 31865, 44085, 43316, 39000, 33857, 28904],
  이사업체: [8262, 8705, 7991, 7548, 9043, 8580, 10891, 13229, 9163, 10294, 9052, 8726],
  포장이사견적: [2574, 2458, 3699, 4735, 8025, 2636, 3337, 4501, 3453, 5854, 4453, 3600],
  이삿집센터: [715, 718, 717, 385, 175, 170, 205, 370, 652, 692, 590, 584],
  입주청소: [36443, 39603, 39135, 40266, 45180, 57988, 205387, 147010, 138793, 145607, 74800, 81166],
  입주청소업체: [1394, 1666, 4438, 2319, 1466, 1567, 2010, 2435, 1505, 1652, 1425, 1517],
  이사청소: [8522, 8622, 8583, 8062, 8715, 9059, 9145, 11070, 7410, 7362, 6839, 6838],
  입주청소비용: [14171, 14149, 15426, 13859, 12642, 14766, 15214, 18355, 16511, 18427, 15360, 14596],
  서울포장이사: [512, 882, 991, 465, 382, 422, 359, 589, 489, 439, 504, 487],
  서울입주청소: [1170, 1022, 1035, 965, 826, 962, 1406, 1720, 1763, 2243, 1932, 1239],
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

function buildRows() {
  const now = new Date().toISOString();
  const rows = [];
  for (const [phrase, meta] of Object.entries(TARGETS)) {
    const vols = VOLUMES[phrase];
    if (!vols || vols.length !== MONTHS.length) {
      continue;
    }
    for (let i = 0; i < MONTHS.length; i += 1) {
      const v = vols[i];
      rows.push({
        keyword_key: meta.keyword_key,
        region_scope: meta.region_scope,
        region_key: meta.region_key,
        search_phrase: phrase,
        yyyymm: MONTHS[i],
        search_volume_month: v,
        search_volume_below_ten: false,
        index_mom_percent: 0,
        source: "searchad_console",
        updated_at: now,
      });
    }
  }
  return rows;
}

loadEnvLocal();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요 (.env.local)");
  process.exit(1);
}

const rows = buildRows();
const supabase = createClient(url, key);

const BATCH = 100;
let upserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const { error, count } = await supabase.from("demand_keyword_monthly").upsert(chunk, {
    onConflict: "keyword_key,region_scope,region_key,search_phrase,yyyymm",
    count: "exact",
  });
  if (error) {
    console.error("upsert failed:", error.message);
    process.exit(1);
  }
  upserted += count ?? chunk.length;
}

console.log(`OK: ${upserted} rows upserted (${rows.length} rows from ${Object.keys(VOLUMES).length} phrases with volumes)`);
console.log(`Period: ${MONTHS[0]} ~ ${MONTHS[MONTHS.length - 1]}`);

// verify national basket
const { data: check } = await supabase
  .from("demand_keyword_monthly")
  .select("search_phrase, yyyymm")
  .eq("region_scope", "national")
  .eq("region_key", "kr")
  .eq("source", "searchad_console")
  .in("search_phrase", Object.keys(TARGETS).filter((p) => !p.startsWith("서울")));

const phrases = new Set((check ?? []).map((r) => r.search_phrase));
const months = new Set((check ?? []).map((r) => r.yyyymm));
const handFree = [...phrases].filter((p) => p.endsWith("손없는날")).length;
console.log(`Verify national: ${phrases.size} phrases (${handFree} 손없는날), ${months.size} distinct months`);
