import type { SupabaseClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";

export type DemandRtmsIngestResult =
  | {
      ok: true;
      inserted: number;
      updated: number;
      period: string;
      source: "rtms" | "seed";
      months: number;
      districts: number;
      calls: number;
    }
  | { ok: false; error: string; needsKey?: boolean };

const TRADE_ENDPOINT_CANDIDATES = [
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTradeDev",
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade",
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade",
];

const RENT_ENDPOINT_CANDIDATES = [
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRentDev",
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent",
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent",
];

const SEOUL_GU_LAWD_CD: Record<string, string> = {
  "gangseo-gu": "11500",
  "yangcheon-gu": "11470",
  "mapo-gu": "11440",
  "songpa-gu": "11710",
  "yeongdeungpo-gu": "11560",
  "gwanak-gu": "11620",
  "eunpyeong-gu": "11380",
  "gangnam-gu": "11680",
  "gangdong-gu": "11740",
  "gangbuk-gu": "11305",
  "gwangjin-gu": "11215",
  "guro-gu": "11530",
  "geumcheon-gu": "11545",
  "nowon-gu": "11350",
  "dobong-gu": "11320",
  "dongdaemun-gu": "11230",
  "dongjak-gu": "11590",
  "seocho-gu": "11650",
  "seodaemun-gu": "11410",
  "seongdong-gu": "11200",
  "seongbuk-gu": "11290",
  "yongsan-gu": "11170",
  "jongno-gu": "11110",
  "jung-gu": "11140",
  "jungnang-gu": "11260",
};

const XML = new XMLParser({
  ignoreDeclaration: true,
  removeNSPrefix: true,
  trimValues: true,
});

function getRtmsMonthsBack(): number {
  const v = Number(process.env.DEMAND_RTMS_MONTHS_BACK ?? 36);
  if (!Number.isFinite(v)) return 36;
  return Math.min(Math.max(Math.round(v), 3), 60);
}

function monthKeysBackFromPreviousKstMonth(count: number): string[] {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kstNow.getUTCFullYear();
  const month = kstNow.getUTCMonth() + 1;
  const keys: string[] = [];
  let y = year;
  let m = month - 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  for (let i = 0; i < count; i += 1) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return keys.sort();
}

type ParsedPage = { totalCount: number; rowCount: number };

function readNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").trim());
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function parseRtmsPage(xmlText: string): ParsedPage {
  const parsed = XML.parse(xmlText) as Record<string, unknown>;
  const response = parsed.response as Record<string, unknown> | undefined;
  const body = response?.body as Record<string, unknown> | undefined;
  const totalCount = readNum(body?.totalCount);
  const items = body?.items as Record<string, unknown> | undefined;
  const item = items?.item;
  let rowCount = 0;
  if (Array.isArray(item)) rowCount = item.length;
  else if (item && typeof item === "object") rowCount = 1;
  return { totalCount, rowCount };
}

async function fetchWithFallback(
  endpointCandidates: string[],
  serviceKey: string,
  lawdCd: string,
  dealYmd: string,
  pageNo: number
): Promise<ParsedPage> {
  const params = new URLSearchParams({
    serviceKey,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    pageNo: String(pageNo),
    numOfRows: "1000",
  });

  let lastError = "RTMS fetch failed";
  for (const endpoint of endpointCandidates) {
    const url = `${endpoint}?${params.toString()}`;
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      const text = await res.text();
      if (!res.ok) {
        lastError = `[${endpoint}] HTTP ${res.status}: ${text.slice(0, 160)}`;
        continue;
      }
      if (!text.trim().startsWith("<")) {
        lastError = `[${endpoint}] Non-XML response: ${text.slice(0, 160)}`;
        continue;
      }
      return parseRtmsPage(text);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      lastError = `[${endpoint}] ${message}`;
    }
  }
  throw new Error(lastError);
}

export async function runDemandRtmsIngestJob(supabase: SupabaseClient): Promise<DemandRtmsIngestResult> {
  const tradeKey = process.env.MOLIT_RTMS_TRADE_SERVICE_KEY?.trim();
  const rentKey = process.env.MOLIT_RTMS_RENT_SERVICE_KEY?.trim();
  const sharedKey = process.env.MOLIT_RTMS_SERVICE_KEY?.trim();

  const hasTradeKey = Boolean(tradeKey || sharedKey);
  const hasRentKey = Boolean(rentKey || sharedKey);
  if (!hasTradeKey || !hasRentKey) {
    return {
      ok: false,
      needsKey: true,
      error:
        "RTMS key is missing: set MOLIT_RTMS_TRADE_SERVICE_KEY and MOLIT_RTMS_RENT_SERVICE_KEY (or shared MOLIT_RTMS_SERVICE_KEY)",
    };
  }

  const months = monthKeysBackFromPreviousKstMonth(getRtmsMonthsBack());
  const districtSlugs = Object.keys(SEOUL_GU_LAWD_CD);
  const tradeServiceKey = tradeKey || sharedKey!;
  const rentServiceKey = rentKey || sharedKey!;

  const rows: Array<{
    region_scope: "district" | "city" | "national";
    region_key: string;
    yyyymm: string;
    sale_count: number;
    jeonse_count: number;
    source: "rtms";
    updated_at: string;
  }> = [];

  let calls = 0;
  for (const yyyymm of months) {
    const dealYmd = yyyymm.replace("-", "");
    let monthSaleTotal = 0;
    let monthRentTotal = 0;

    for (const slug of districtSlugs) {
      const lawdCd = SEOUL_GU_LAWD_CD[slug];

      // trade pages
      let saleCount = 0;
      const tradePage1 = await fetchWithFallback(
        TRADE_ENDPOINT_CANDIDATES,
        tradeServiceKey,
        lawdCd,
        dealYmd,
        1
      );
      calls += 1;
      saleCount += tradePage1.rowCount;
      const tradePages = Math.max(1, Math.ceil(tradePage1.totalCount / 1000));
      for (let pageNo = 2; pageNo <= tradePages; pageNo += 1) {
        const page = await fetchWithFallback(
          TRADE_ENDPOINT_CANDIDATES,
          tradeServiceKey,
          lawdCd,
          dealYmd,
          pageNo
        );
        calls += 1;
        saleCount += page.rowCount;
      }

      // rent pages
      let jeonseCount = 0;
      const rentPage1 = await fetchWithFallback(
        RENT_ENDPOINT_CANDIDATES,
        rentServiceKey,
        lawdCd,
        dealYmd,
        1
      );
      calls += 1;
      jeonseCount += rentPage1.rowCount;
      const rentPages = Math.max(1, Math.ceil(rentPage1.totalCount / 1000));
      for (let pageNo = 2; pageNo <= rentPages; pageNo += 1) {
        const page = await fetchWithFallback(
          RENT_ENDPOINT_CANDIDATES,
          rentServiceKey,
          lawdCd,
          dealYmd,
          pageNo
        );
        calls += 1;
        jeonseCount += page.rowCount;
      }

      monthSaleTotal += saleCount;
      monthRentTotal += jeonseCount;
      rows.push({
        region_scope: "district",
        region_key: slug,
        yyyymm,
        sale_count: saleCount,
        jeonse_count: jeonseCount,
        source: "rtms",
        updated_at: new Date().toISOString(),
      });
    }

    // city aggregate
    rows.push({
      region_scope: "city",
      region_key: "seoul",
      yyyymm,
      sale_count: monthSaleTotal,
      jeonse_count: monthRentTotal,
      source: "rtms",
      updated_at: new Date().toISOString(),
    });
    // national placeholder (MVP: seoul aggregate mirrored)
    rows.push({
      region_scope: "national",
      region_key: "kr",
      yyyymm,
      sale_count: monthSaleTotal,
      jeonse_count: monthRentTotal,
      source: "rtms",
      updated_at: new Date().toISOString(),
    });
  }

  const { error, count } = await supabase
    .from("demand_rtms_monthly")
    .upsert(rows, { onConflict: "region_scope,region_key,yyyymm", count: "exact" });
  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    inserted: count ?? rows.length,
    updated: 0,
    period: `${months[0]}..${months[months.length - 1]}`,
    source: "rtms",
    months: months.length,
    districts: districtSlugs.length,
    calls,
  };
}
