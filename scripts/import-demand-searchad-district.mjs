#!/usr/bin/env node
/**
 * 서울 25구 × 2키워드 검색광고 월별 → demand_keyword_monthly (축적 전용)
 * 화면·지역수요점수에는 사용하지 않음.
 *
 * VOLUMES에 `{구명}포장이사` / `{구명}입주청소` 12개월 배열을 채운 뒤:
 *   node scripts/import-demand-searchad-district.mjs
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

/** lib/demand/slugs.ts SEOUL_GU_SLUG_TO_NAME 과 동기화 */
const SEOUL_GU_SLUG_TO_NAME = {
  "gangseo-gu": "강서구",
  "yangcheon-gu": "양천구",
  "mapo-gu": "마포구",
  "songpa-gu": "송파구",
  "yeongdeungpo-gu": "영등포구",
  "gwanak-gu": "관악구",
  "eunpyeong-gu": "은평구",
  "gangnam-gu": "강남구",
  "gangdong-gu": "강동구",
  "gangbuk-gu": "강북구",
  "gwangjin-gu": "광진구",
  "guro-gu": "구로구",
  "geumcheon-gu": "금천구",
  "nowon-gu": "노원구",
  "dobong-gu": "도봉구",
  "dongdaemun-gu": "동대문구",
  "dongjak-gu": "동작구",
  "seocho-gu": "서초구",
  "seodaemun-gu": "서대문구",
  "seongdong-gu": "성동구",
  "seongbuk-gu": "성북구",
  "yongsan-gu": "용산구",
  "jongno-gu": "종로구",
  "jung-gu": "중구",
  "jungnang-gu": "중랑구",
};

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

/** phrase → 12개월 검색수. 예: "강북구포장이사": [10, 12, ...] */
const VOLUMES = {
  // "강북구포장이사": [],
  // "강북구입주청소": [],
};

const TARGETS = {};
for (const [slug, guName] of Object.entries(SEOUL_GU_SLUG_TO_NAME)) {
  const packingPhrase = `${guName}포장이사`;
  const moveInPhrase = `${guName}입주청소`;
  TARGETS[packingPhrase] = {
    keyword_key: "packing",
    region_scope: "district",
    region_key: `seoul:${slug}`,
  };
  TARGETS[moveInPhrase] = {
    keyword_key: "move_in_clean",
    region_scope: "district",
    region_key: `seoul:${slug}`,
  };
}

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
        search_volume_below_ten: v < 10,
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
if (rows.length === 0) {
  console.log(
    `대상: ${Object.keys(TARGETS).length} phrases (25구 × 2). VOLUMES에 12개월 배열을 채운 뒤 다시 실행하세요.`
  );
  process.exit(0);
}

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

const phrases = new Set(rows.map((r) => r.search_phrase));
const districts = new Set(rows.map((r) => r.region_key));
console.log(
  `OK: ${upserted} rows upserted (${phrases.size} phrases, ${districts.size} districts, archive only)`
);
console.log(`Period: ${MONTHS[0]} ~ ${MONTHS[MONTHS.length - 1]}`);
