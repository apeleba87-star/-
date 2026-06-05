import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const SEARCHAD_ROLLING_30D_SOURCE = "searchad_rolling_30d";

function kstToday() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

async function probeColumns() {
  const { data, error } = await supabase
    .from("demand_keyword_daily")
    .select("search_volume_rolling_30d, search_volume_below_ten")
    .limit(1);
  console.log("column probe:", error ? `FAIL ${error.message}` : `OK (${data?.length ?? 0} row)`);
  return !error;
}

async function probeRollingCount() {
  const { count, error } = await supabase
    .from("demand_keyword_daily")
    .select("*", { count: "exact", head: true })
    .eq("source", SEARCHAD_ROLLING_30D_SOURCE);
  console.log("rolling rows:", error ? `FAIL ${error.message}` : (count ?? 0));
}

async function testUpsert() {
  const snapshotDate = kstToday();
  const row = {
    keyword_key: "packing",
    region_scope: "national",
    region_key: "kr",
    search_phrase: "포장이사",
    period_date: snapshotDate,
    index_ratio: 0,
    search_volume_rolling_30d: 12345,
    search_volume_below_ten: false,
    source: SEARCHAD_ROLLING_30D_SOURCE,
    updated_at: new Date().toISOString(),
  };
  const { error, count } = await supabase.from("demand_keyword_daily").upsert([row], {
    onConflict: "keyword_key,region_scope,region_key,period_date,source",
    count: "exact",
  });
  console.log("test upsert:", error ? `FAIL ${error.message}` : `OK count=${count ?? 1}`);
  if (!error) {
    await supabase
      .from("demand_keyword_daily")
      .delete()
      .eq("source", SEARCHAD_ROLLING_30D_SOURCE)
      .eq("search_phrase", "포장이사")
      .eq("period_date", snapshotDate)
      .eq("region_scope", "national")
      .eq("region_key", "kr");
    console.log("test row cleaned up");
  }
}

const PACKING = ["포장이사", "이사업체", "포장이사견적", "이삿집센터"];
const MOVE_IN = ["입주청소", "입주청소업체", "이사청소", "입주청소비용"];
const HINT_BATCH = 5;

async function fetchVolumes(phrases) {
  const apiKey = env.NAVER_SEARCHAD_API_KEY || env.NAVER_SEARCHAD_ACCESS_LICENSE;
  const secret = env.NAVER_SEARCHAD_SECRET_KEY;
  const customerId = env.NAVER_SEARCHAD_CUSTOMER_ID;
  const uri = "/keywordstool";
  const out = new Map();
  for (let i = 0; i < phrases.length; i += HINT_BATCH) {
    const chunk = phrases.slice(i, i + HINT_BATCH);
    const timestamp = String(Date.now());
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.GET.${uri}`)
      .digest("base64");
    const params = new URLSearchParams({ hintKeywords: chunk.join(","), showDetail: "1" });
    const res = await fetch(`https://api.searchad.naver.com${uri}?${params}`, {
      headers: {
        "X-Timestamp": timestamp,
        "X-API-KEY": apiKey,
        "X-Customer": customerId,
        "X-Signature": signature,
      },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`searchad batch ${res.status}: ${text.slice(0, 200)}`);
    const json = JSON.parse(text);
    for (const phrase of chunk) {
      const row = (json.keywordList ?? []).find((k) => (k.relKeyword ?? "").replace(/\s/g, "") === phrase);
      if (row) {
        const pc = Number(row.monthlyPcQcCnt) || 0;
        const mob = Number(row.monthlyMobileQcCnt) || 0;
        out.set(phrase, pc + mob);
      }
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return out;
}

async function runFullRollingIngest() {
  const apiKey = env.NAVER_SEARCHAD_API_KEY || env.NAVER_SEARCHAD_ACCESS_LICENSE;
  const secret = env.NAVER_SEARCHAD_SECRET_KEY;
  const customerId = env.NAVER_SEARCHAD_CUSTOMER_ID;
  if (!apiKey || !secret || !customerId) {
    console.log("full rolling ingest: SKIP");
    return;
  }
  const phrases = [...PACKING, ...MOVE_IN, "서울포장이사", "서울입주청소"];
  try {
    const volumes = await fetchVolumes(phrases);
    const snapshotDate = kstToday();
    const now = new Date().toISOString();
    const rows = [];
    for (const phrase of PACKING) {
      rows.push({
        keyword_key: "packing",
        region_scope: "national",
        region_key: "kr",
        search_phrase: phrase,
        period_date: snapshotDate,
        index_ratio: 0,
        search_volume_rolling_30d: volumes.get(phrase) ?? null,
        search_volume_below_ten: false,
        source: SEARCHAD_ROLLING_30D_SOURCE,
        updated_at: now,
      });
    }
    for (const phrase of MOVE_IN) {
      rows.push({
        keyword_key: "move_in_clean",
        region_scope: "national",
        region_key: "kr",
        search_phrase: phrase,
        period_date: snapshotDate,
        index_ratio: 0,
        search_volume_rolling_30d: volumes.get(phrase) ?? null,
        search_volume_below_ten: false,
        source: SEARCHAD_ROLLING_30D_SOURCE,
        updated_at: now,
      });
    }
    rows.push(
      {
        keyword_key: "packing",
        region_scope: "city",
        region_key: "seoul",
        search_phrase: "서울포장이사",
        period_date: snapshotDate,
        index_ratio: 0,
        search_volume_rolling_30d: volumes.get("서울포장이사") ?? null,
        search_volume_below_ten: false,
        source: SEARCHAD_ROLLING_30D_SOURCE,
        updated_at: now,
      },
      {
        keyword_key: "move_in_clean",
        region_scope: "city",
        region_key: "seoul",
        search_phrase: "서울입주청소",
        period_date: snapshotDate,
        index_ratio: 0,
        search_volume_rolling_30d: volumes.get("서울입주청소") ?? null,
        search_volume_below_ten: false,
        source: SEARCHAD_ROLLING_30D_SOURCE,
        updated_at: now,
      }
    );
    const { error, count } = await supabase.from("demand_keyword_daily").upsert(rows, {
      onConflict: "keyword_key,region_scope,region_key,period_date,source",
      count: "exact",
    });
    console.log("full rolling ingest:", error ? `FAIL ${error.message}` : `OK ${count ?? rows.length} rows`);
  } catch (e) {
    console.log("full rolling ingest: FAIL", e.message);
  }
}

async function testDatalabApi() {
  const clientId = env.NAVER_CLIENT_ID;
  const secret = env.NAVER_CLIENT_SECRET;
  if (!clientId || !secret) {
    console.log("datalab api: SKIP");
    return;
  }
  const end = kstToday();
  const body = {
    startDate: end.replace(/-\d{2}$/, "-01"),
    endDate: end,
    timeUnit: "date",
    keywordGroups: [{ groupName: "test", keywords: ["포장이사"] }],
  };
  const res = await fetch("https://openapi.naver.com/v1/datalab/search", {
    method: "POST",
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": secret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log("datalab api:", res.ok ? `OK ${text.slice(0, 100)}` : `FAIL ${res.status} ${text.slice(0, 200)}`);
}

async function testSearchAdApi() {
  const apiKey = env.NAVER_SEARCHAD_API_KEY || env.NAVER_SEARCHAD_ACCESS_LICENSE;
  const secret = env.NAVER_SEARCHAD_SECRET_KEY;
  const customerId = env.NAVER_SEARCHAD_CUSTOMER_ID;
  if (!apiKey || !secret || !customerId) {
    console.log("searchad api: SKIP (keys missing in .env.local)");
    return;
  }
  const uri = "/keywordstool";
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.GET.${uri}`)
    .digest("base64");
  const params = new URLSearchParams({ hintKeywords: "포장이사", showDetail: "1" });
  const res = await fetch(`https://api.searchad.naver.com${uri}?${params}`, {
    headers: {
      "X-Timestamp": timestamp,
      "X-API-KEY": apiKey,
      "X-Customer": customerId,
      "X-Signature": signature,
    },
  });
  const text = await res.text();
  console.log("searchad api:", res.ok ? `OK ${text.slice(0, 120)}` : `FAIL ${res.status} ${text.slice(0, 200)}`);
}

console.log("=== debug rolling ingest ===");
console.log("supabase:", env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40) + "...");
await probeColumns();
await probeRollingCount();
await testUpsert();
await testSearchAdApi();
await runFullRollingIngest();
await probeRollingCount();
await testDatalabApi();
