import type { SupabaseClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";
import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";
import { demandDistrictRegionKey } from "@/lib/demand/regions";

type HousingType = "apartment";
type DealType = "sale" | "jeonse" | "monthly";

export type DemandRtmsDealsIngestResult =
  | {
      ok: true;
      housingType: HousingType;
      period: string;
      months: number;
      districts: number;
      calls: number;
      rows: number;
      cityId?: string;
    }
  | { ok: false; error: string; needsKey?: boolean };

export type DemandRtmsDealsIngestOptions = {
  monthsBack?: number;
  cityId?: string;
  districtSlugs?: string[];
};

type DistrictTarget = {
  cityId: string;
  cityLabel: string;
  districtSlug: string;
  districtLabel: string;
  regionKey: string;
  lawdCd: string;
};

type ParsedRtmsItemsPage = {
  totalCount: number;
  items: Record<string, unknown>[];
};

type RtmsDealRow = {
  source: "rtms";
  housing_type: HousingType;
  deal_type: DealType;
  region_key: string;
  city_id: string;
  city_label: string;
  district_slug: string;
  district_label: string;
  lawd_cd: string;
  dong: string;
  building_name: string;
  deal_yyyymm: string;
  deal_date: string;
  deal_day: number;
  amount_krw: number;
  monthly_rent_krw: number | null;
  area_sqm: number | null;
  floor: number | null;
  build_year: number | null;
  raw: Record<string, unknown>;
  updated_at: string;
};

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

const DEFAULT_MONTHS_BACK = 12;
const NUM_OF_ROWS = 1000;
const FETCH_RETRIES = 4;
const RETRY_BASE_MS = 2000;
const CALL_DELAY_MS = 120;

function resolveMonthsBack(override?: number): number {
  const raw = override ?? Number(process.env.DEMAND_RTMS_DEALS_MONTHS_BACK ?? process.env.DEMAND_RTMS_MONTHS_BACK ?? DEFAULT_MONTHS_BACK);
  if (!Number.isFinite(raw)) return DEFAULT_MONTHS_BACK;
  return Math.min(Math.max(Math.round(raw), 1), 24);
}

function monthKeysBackFromPreviousKstMonth(count: number): string[] {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  let year = kstNow.getUTCFullYear();
  let month = kstNow.getUTCMonth();
  if (month === 0) {
    month = 12;
    year -= 1;
  }

  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return keys.sort();
}

function buildDistrictTargets(cityId?: string, districtSlugs?: string[]): DistrictTarget[] {
  const slugSet = districtSlugs?.length ? new Set(districtSlugs) : null;
  const cities = cityId
    ? DEMAND_REGION_REGISTRY.filter((city) => city.id === cityId)
    : DEMAND_REGION_REGISTRY;

  if (cityId && cities.length === 0) throw new Error(`Unknown cityId: ${cityId}`);

  return cities.flatMap((city) =>
    city.districts
      .filter((district) => !slugSet || slugSet.has(district.slug))
      .map((district) => ({
        cityId: city.id,
        cityLabel: city.label,
        districtSlug: district.slug,
        districtLabel: district.gu,
        regionKey: demandDistrictRegionKey(city.id, district.slug),
        lawdCd: district.lawdCd,
      }))
  );
}

function readNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function readOptionalNumber(value: unknown): number | null {
  const n = readNumber(value);
  return n > 0 ? n : null;
}

function readString(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function readMoneyKrw(item: Record<string, unknown>, keys: string[]): number {
  return readNumber(readString(item, keys)) * 10_000;
}

function normalizeItem(item: unknown): Record<string, unknown>[] {
  if (Array.isArray(item)) return item.filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v));
  if (item && typeof item === "object" && !Array.isArray(item)) return [item as Record<string, unknown>];
  return [];
}

function parseItemsPage(xmlText: string): ParsedRtmsItemsPage {
  const parsed = XML.parse(xmlText) as Record<string, unknown>;
  const response = parsed.response as Record<string, unknown> | undefined;
  const body = response?.body as Record<string, unknown> | undefined;
  const items = body?.items as Record<string, unknown> | undefined;
  return {
    totalCount: readNumber(body?.totalCount),
    items: normalizeItem(items?.item),
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function fetchRtmsItemsPage(
  endpointCandidates: string[],
  serviceKey: string,
  lawdCd: string,
  dealYmd: string,
  pageNo: number
): Promise<ParsedRtmsItemsPage> {
  const params = new URLSearchParams({
    serviceKey,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    pageNo: String(pageNo),
    numOfRows: String(NUM_OF_ROWS),
  });

  let lastError = "RTMS deal fetch failed";
  for (const endpoint of endpointCandidates) {
    const url = `${endpoint}?${params.toString()}`;
    for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
      if (CALL_DELAY_MS > 0) await sleep(CALL_DELAY_MS);
      try {
        const res = await fetch(url, { method: "GET", cache: "no-store" });
        const text = await res.text();
        if (!res.ok) {
          lastError = `[${endpoint}] HTTP ${res.status}: ${text.slice(0, 160)}`;
          if (isRetryableStatus(res.status) && attempt < FETCH_RETRIES) {
            await sleep(RETRY_BASE_MS * attempt);
            continue;
          }
          break;
        }
        if (!text.trim().startsWith("<")) {
          lastError = `[${endpoint}] Non-XML response: ${text.slice(0, 160)}`;
          break;
        }
        return parseItemsPage(text);
      } catch (e) {
        lastError = e instanceof Error ? `[${endpoint}] ${e.message}` : `[${endpoint}] ${String(e)}`;
        if (attempt < FETCH_RETRIES) {
          await sleep(RETRY_BASE_MS * attempt);
          continue;
        }
      }
    }
  }
  throw new Error(lastError);
}

function parseDealDate(item: Record<string, unknown>, yyyymm: string): { dealDate: string; day: number } {
  const year = readNumber(readString(item, ["dealYear", "년"]));
  const month = readNumber(readString(item, ["dealMonth", "월"]));
  const day = readNumber(readString(item, ["dealDay", "일"])) || 1;
  const [fallbackYear, fallbackMonth] = yyyymm.split("-").map(Number);
  const safeYear = year || fallbackYear || 1970;
  const safeMonth = month || fallbackMonth || 1;
  const safeDay = Math.min(Math.max(day, 1), 31);
  return {
    dealDate: `${safeYear}-${String(safeMonth).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`,
    day: safeDay,
  };
}

function mapTradeItem(item: Record<string, unknown>, target: DistrictTarget, yyyymm: string, updatedAt: string): RtmsDealRow | null {
  const amountKrw = readMoneyKrw(item, ["dealAmount", "거래금액"]);
  if (amountKrw <= 0) return null;
  const { dealDate, day } = parseDealDate(item, yyyymm);
  return {
    source: "rtms",
    housing_type: "apartment",
    deal_type: "sale",
    region_key: target.regionKey,
    city_id: target.cityId,
    city_label: target.cityLabel,
    district_slug: target.districtSlug,
    district_label: target.districtLabel,
    lawd_cd: target.lawdCd,
    dong: readString(item, ["umdNm", "법정동"]),
    building_name: readString(item, ["aptNm", "아파트"]),
    deal_yyyymm: yyyymm,
    deal_date: dealDate,
    deal_day: day,
    amount_krw: amountKrw,
    monthly_rent_krw: null,
    area_sqm: readOptionalNumber(readString(item, ["excluUseAr", "전용면적"])),
    floor: readOptionalNumber(readString(item, ["floor", "층"])),
    build_year: readOptionalNumber(readString(item, ["buildYear", "건축년도"])),
    raw: item,
    updated_at: updatedAt,
  };
}

function mapRentItem(item: Record<string, unknown>, target: DistrictTarget, yyyymm: string, updatedAt: string): RtmsDealRow | null {
  const depositKrw = readMoneyKrw(item, ["deposit", "보증금액"]);
  const monthlyRentKrw = readMoneyKrw(item, ["monthlyRent", "월세금액"]);
  if (depositKrw <= 0 && monthlyRentKrw <= 0) return null;
  const { dealDate, day } = parseDealDate(item, yyyymm);
  return {
    source: "rtms",
    housing_type: "apartment",
    deal_type: monthlyRentKrw > 0 ? "monthly" : "jeonse",
    region_key: target.regionKey,
    city_id: target.cityId,
    city_label: target.cityLabel,
    district_slug: target.districtSlug,
    district_label: target.districtLabel,
    lawd_cd: target.lawdCd,
    dong: readString(item, ["umdNm", "법정동"]),
    building_name: readString(item, ["aptNm", "아파트"]),
    deal_yyyymm: yyyymm,
    deal_date: dealDate,
    deal_day: day,
    amount_krw: depositKrw,
    monthly_rent_krw: monthlyRentKrw > 0 ? monthlyRentKrw : null,
    area_sqm: readOptionalNumber(readString(item, ["excluUseAr", "전용면적"])),
    floor: readOptionalNumber(readString(item, ["floor", "층"])),
    build_year: readOptionalNumber(readString(item, ["buildYear", "건축년도"])),
    raw: item,
    updated_at: updatedAt,
  };
}

function rowConflictKey(row: RtmsDealRow): string {
  return [
    row.housing_type,
    row.deal_type,
    row.lawd_cd.trim(),
    row.dong.trim(),
    row.building_name.trim(),
    row.deal_date,
    row.area_sqm == null ? "" : Number(row.area_sqm).toFixed(2),
    row.floor == null ? "" : String(row.floor),
    String(row.amount_krw),
    row.monthly_rent_krw == null ? "" : String(row.monthly_rent_krw),
  ].join("|");
}

async function upsertRows(supabase: SupabaseClient, rows: RtmsDealRow[]): Promise<number> {
  if (!rows.length) return 0;
  const deduped = [...new Map(rows.map((row) => [rowConflictKey(row), row])).values()];

  const upsertOptions = {
    onConflict:
      "housing_type,deal_type,lawd_cd,dong,building_name,deal_date,area_sqm,floor,amount_krw,monthly_rent_krw",
  };
  const { error } = await supabase.from("demand_rtms_deals").upsert(deduped, upsertOptions);
  if (error?.message.includes("cannot affect row a second time")) {
    for (const row of deduped) {
      const { error: rowError } = await supabase.from("demand_rtms_deals").upsert(row, upsertOptions);
      if (rowError) throw new Error(rowError.message);
    }
    return deduped.length;
  }
  if (error) throw new Error(error.message);
  return deduped.length;
}

export async function runDemandRtmsDealsIngestJob(
  supabase: SupabaseClient,
  options?: DemandRtmsDealsIngestOptions
): Promise<DemandRtmsDealsIngestResult> {
  const tradeKey = process.env.MOLIT_RTMS_TRADE_SERVICE_KEY?.trim();
  const rentKey = process.env.MOLIT_RTMS_RENT_SERVICE_KEY?.trim();
  const sharedKey = process.env.MOLIT_RTMS_SERVICE_KEY?.trim();
  if (!(tradeKey || sharedKey) || !(rentKey || sharedKey)) {
    return {
      ok: false,
      needsKey: true,
      error:
        "RTMS key is missing: set MOLIT_RTMS_TRADE_SERVICE_KEY and MOLIT_RTMS_RENT_SERVICE_KEY (or shared MOLIT_RTMS_SERVICE_KEY)",
    };
  }

  const tradeServiceKey = tradeKey || sharedKey!;
  const rentServiceKey = rentKey || sharedKey!;
  const monthsBack = resolveMonthsBack(options?.monthsBack);
  const months = monthKeysBackFromPreviousKstMonth(monthsBack);
  const targets = buildDistrictTargets(options?.cityId, options?.districtSlugs);
  if (!targets.length) return { ok: false, error: "No RTMS deal targets with LAWD codes" };

  let calls = 0;
  let rows = 0;

  try {
    for (const yyyymm of months) {
      const dealYmd = yyyymm.replace("-", "");
      for (const target of targets) {
        const updatedAt = new Date().toISOString();
        const tradeFirst = await fetchRtmsItemsPage(TRADE_ENDPOINT_CANDIDATES, tradeServiceKey, target.lawdCd, dealYmd, 1);
        calls += 1;
        const tradePages = Math.max(1, Math.ceil(tradeFirst.totalCount / NUM_OF_ROWS));
        rows += await upsertRows(
          supabase,
          tradeFirst.items
            .map((item) => mapTradeItem(item, target, yyyymm, updatedAt))
            .filter((row): row is RtmsDealRow => row != null)
        );
        for (let pageNo = 2; pageNo <= tradePages; pageNo += 1) {
          const page = await fetchRtmsItemsPage(TRADE_ENDPOINT_CANDIDATES, tradeServiceKey, target.lawdCd, dealYmd, pageNo);
          calls += 1;
          rows += await upsertRows(
            supabase,
            page.items
              .map((item) => mapTradeItem(item, target, yyyymm, updatedAt))
              .filter((row): row is RtmsDealRow => row != null)
          );
        }

        const rentFirst = await fetchRtmsItemsPage(RENT_ENDPOINT_CANDIDATES, rentServiceKey, target.lawdCd, dealYmd, 1);
        calls += 1;
        const rentPages = Math.max(1, Math.ceil(rentFirst.totalCount / NUM_OF_ROWS));
        rows += await upsertRows(
          supabase,
          rentFirst.items
            .map((item) => mapRentItem(item, target, yyyymm, updatedAt))
            .filter((row): row is RtmsDealRow => row != null)
        );
        for (let pageNo = 2; pageNo <= rentPages; pageNo += 1) {
          const page = await fetchRtmsItemsPage(RENT_ENDPOINT_CANDIDATES, rentServiceKey, target.lawdCd, dealYmd, pageNo);
          calls += 1;
          rows += await upsertRows(
            supabase,
            page.items
              .map((item) => mapRentItem(item, target, yyyymm, updatedAt))
              .filter((row): row is RtmsDealRow => row != null)
          );
        }
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }

  return {
    ok: true,
    housingType: "apartment",
    period: `${months[0]}..${months[months.length - 1]}`,
    months: months.length,
    districts: targets.length,
    calls,
    rows,
    cityId: options?.cityId,
  };
}
