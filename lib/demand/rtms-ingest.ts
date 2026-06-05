import type { SupabaseClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";
import { DEMAND_LAWD_BY_REGION_KEY } from "@/lib/demand/lawd-codes.generated";
import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";
import { demandDistrictRegionKey } from "@/lib/demand/regions";

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
      cityId?: string;
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

const XML = new XMLParser({
  ignoreDeclaration: true,
  removeNSPrefix: true,
  trimValues: true,
});

/** 운영·크론 기본: 최근 2개월 (MoM + 늦은 신고 반영). */
export const DEMAND_RTMS_MONTHS_BACK_DEFAULT = 2;
/** 최초 1회 백필용. */
export const DEMAND_RTMS_MONTHS_BACK_BACKFILL = 36;

export type DemandRtmsIngestOptions = {
  /** Override env DEMAND_RTMS_MONTHS_BACK (min 1, max 60). */
  monthsBack?: number;
  /** 시·도 단위 수집 (예: seoul, gyeongbuk). 미지정 시 전국 226개 시군구 */
  cityId?: string;
  /** 시·도 ingest 후 전국 합산 행 갱신 */
  refreshNational?: boolean;
  /** RTMS API 없이 demand_rtms_monthly national 행만 시·도 합산 갱신 */
  nationalRefreshOnly?: boolean;
};

type DistrictTarget = {
  cityId: string;
  slug: string;
  regionKey: string;
  lawdCd: string;
};

function resolveRtmsMonthsBack(override?: number): number {
  const raw = override ?? Number(process.env.DEMAND_RTMS_MONTHS_BACK ?? DEMAND_RTMS_MONTHS_BACK_DEFAULT);
  if (!Number.isFinite(raw)) {
    return override != null ? 1 : DEMAND_RTMS_MONTHS_BACK_DEFAULT;
  }
  const n = Math.round(raw);
  return Math.min(Math.max(n, 1), 60);
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

function buildDistrictTargets(cityId?: string): DistrictTarget[] {
  const cities = cityId
    ? DEMAND_REGION_REGISTRY.filter((c) => c.id === cityId)
    : DEMAND_REGION_REGISTRY;

  if (cityId && cities.length === 0) {
    throw new Error(`Unknown cityId: ${cityId}`);
  }

  return cities.flatMap((city) =>
    city.districts
      .map((d) => {
        const regionKey = demandDistrictRegionKey(city.id, d.slug);
        const lawdCd = d.lawdCd ?? DEMAND_LAWD_BY_REGION_KEY[regionKey];
        if (!lawdCd) return null;
        return {
          cityId: city.id,
          slug: d.slug,
          regionKey,
          lawdCd,
        };
      })
      .filter((t): t is DistrictTarget => t != null)
  );
}

/** 크론: 요일별 시·도 1곳씩 순환 (17일 주기) */
export function pickRotatingDemandCityId(date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const dayIndex = Math.floor(kst.getTime() / (24 * 60 * 60 * 1000));
  return DEMAND_REGION_REGISTRY[dayIndex % DEMAND_REGION_REGISTRY.length]!.id;
}

async function refreshNationalAggregate(
  supabase: SupabaseClient,
  months: string[]
): Promise<void> {
  const updatedAt = new Date().toISOString();
  const nationalRows: Array<{
    region_scope: "national";
    region_key: string;
    yyyymm: string;
    sale_count: number;
    jeonse_count: number;
    source: "rtms";
    updated_at: string;
  }> = [];

  for (const yyyymm of months) {
    const { data, error } = await supabase
      .from("demand_rtms_monthly")
      .select("sale_count, jeonse_count")
      .eq("region_scope", "city")
      .eq("yyyymm", yyyymm);

    if (error || !data?.length) continue;

    nationalRows.push({
      region_scope: "national",
      region_key: "kr",
      yyyymm,
      sale_count: data.reduce((s, r) => s + Number(r.sale_count ?? 0), 0),
      jeonse_count: data.reduce((s, r) => s + Number(r.jeonse_count ?? 0), 0),
      source: "rtms",
      updated_at: updatedAt,
    });
  }

  if (nationalRows.length) {
    await supabase
      .from("demand_rtms_monthly")
      .upsert(nationalRows, { onConflict: "region_scope,region_key,yyyymm" });
  }
}

export async function runDemandRtmsIngestJob(
  supabase: SupabaseClient,
  options?: DemandRtmsIngestOptions
): Promise<DemandRtmsIngestResult> {
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

  const monthsBack = resolveRtmsMonthsBack(options?.monthsBack);
  const months = monthKeysBackFromPreviousKstMonth(monthsBack);

  if (options?.nationalRefreshOnly) {
    await refreshNationalAggregate(supabase, months);
    return {
      ok: true,
      inserted: 0,
      updated: 0,
      period: `${months[0]}..${months[months.length - 1]}`,
      source: "rtms",
      months: months.length,
      districts: 0,
      calls: 0,
    };
  }

  const targets = buildDistrictTargets(options?.cityId);
  if (!targets.length) {
    return { ok: false, error: "No RTMS district targets with LAWD codes" };
  }

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

  const cityTotals = new Map<string, { sale: number; jeonse: number }>();
  let calls = 0;

  for (const yyyymm of months) {
    const dealYmd = yyyymm.replace("-", "");
    for (const city of DEMAND_REGION_REGISTRY) {
      if (options?.cityId && city.id !== options.cityId) continue;
      cityTotals.set(`${city.id}:${yyyymm}`, { sale: 0, jeonse: 0 });
    }

    for (const target of targets) {
      let saleCount = 0;
      const tradePage1 = await fetchWithFallback(
        TRADE_ENDPOINT_CANDIDATES,
        tradeServiceKey,
        target.lawdCd,
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
          target.lawdCd,
          dealYmd,
          pageNo
        );
        calls += 1;
        saleCount += page.rowCount;
      }

      let jeonseCount = 0;
      const rentPage1 = await fetchWithFallback(
        RENT_ENDPOINT_CANDIDATES,
        rentServiceKey,
        target.lawdCd,
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
          target.lawdCd,
          dealYmd,
          pageNo
        );
        calls += 1;
        jeonseCount += page.rowCount;
      }

      rows.push({
        region_scope: "district",
        region_key: target.regionKey,
        yyyymm,
        sale_count: saleCount,
        jeonse_count: jeonseCount,
        source: "rtms",
        updated_at: new Date().toISOString(),
      });

      const cityKey = `${target.cityId}:${yyyymm}`;
      const agg = cityTotals.get(cityKey) ?? { sale: 0, jeonse: 0 };
      agg.sale += saleCount;
      agg.jeonse += jeonseCount;
      cityTotals.set(cityKey, agg);
    }

    for (const [cityKey, totals] of cityTotals) {
      if (!cityKey.endsWith(`:${yyyymm}`)) continue;
      const cityId = cityKey.slice(0, -(`:${yyyymm}`).length);
      rows.push({
        region_scope: "city",
        region_key: cityId,
        yyyymm,
        sale_count: totals.sale,
        jeonse_count: totals.jeonse,
        source: "rtms",
        updated_at: new Date().toISOString(),
      });
    }
  }

  const { error, count } = await supabase
    .from("demand_rtms_monthly")
    .upsert(rows, { onConflict: "region_scope,region_key,yyyymm", count: "exact" });
  if (error) {
    return { ok: false, error: error.message };
  }

  if (options?.refreshNational || !options?.cityId) {
    await refreshNationalAggregate(supabase, months);
  }

  return {
    ok: true,
    inserted: count ?? rows.length,
    updated: 0,
    period: `${months[0]}..${months[months.length - 1]}`,
    source: "rtms",
    months: months.length,
    districts: targets.length,
    calls,
    cityId: options?.cityId,
  };
}
