import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MoveBudgetCandidate,
  MoveBudgetDeal,
  MoveContractType,
  MoveDealType,
  MoveHousingType,
} from "@/lib/move/budget-types";
import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";
import { demandDistrictRegionKey } from "@/lib/demand/regions";

type RtmsDealRecord = {
  id: number;
  city_label: string | null;
  district_label: string | null;
  dong: string | null;
  building_name: string | null;
  housing_type: string | null;
  deal_type: string | null;
  amount_krw: number | null;
  monthly_rent_krw: number | null;
  area_sqm: number | string | null;
  deal_yyyymm: string | null;
  deal_date: string | null;
  raw: Record<string, unknown> | null;
};

type CandidateAccumulator = MoveBudgetCandidate & {
  buildingNames: Set<string>;
  deals: MoveBudgetDeal[];
};

export type MoveBudgetCandidateFilters = {
  monthsBack?: number;
  dealTypes?: MoveDealType[];
  housingTypes?: MoveHousingType[];
  regionKeys?: string[];
  budgetMin?: number;
  budgetMax?: number;
  monthlyMin?: number;
  monthlyMax?: number;
};

const RTMS_DEALS_PAGE_SIZE = 1000;
const RTMS_DEALS_MAX_ROWS = 250000;
const ALL_REGION_KEY = "all";
const REGION_KEY_TO_DB_KEY = new Map(
  DEMAND_REGION_REGISTRY.flatMap((city) =>
    city.districts.map((district) => [
      `${city.label}:${district.gu}`,
      demandDistrictRegionKey(city.id, district.slug),
    ])
  )
);

function isMoveDealType(value: string | null): value is MoveDealType {
  return value === "sale" || value === "jeonse" || value === "monthly";
}

function isMoveHousingType(value: string | null): value is MoveHousingType {
  return value === "apartment" || value === "villa" || value === "officetel" || value === "detached_multi";
}

function monthsAgoDate(months: number): string {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const date = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth() - months, 1));
  return date.toISOString().slice(0, 10);
}

function numberValue(value: number | string | null): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function readRawString(raw: Record<string, unknown> | null, keys: string[]): string {
  if (!raw) return "";
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function normalizeContractType(raw: Record<string, unknown> | null): { type: MoveContractType; label: string } {
  const value = readRawString(raw, [
    "contractType",
    "계약구분",
    "contractGbn",
    "cntrctType",
    "rentContractType",
  ]);
  if (value.includes("갱신")) return { type: "renewal", label: "갱신" };
  if (value.includes("신규")) return { type: "new", label: "신규" };
  return { type: "unknown", label: "미상" };
}

function buildingHint(housingType: MoveHousingType, names: Set<string>): string {
  const count = names.size;
  if (housingType === "apartment") return count > 1 ? `아파트 ${count}개 단지` : [...names][0] || "아파트";
  if (housingType === "officetel") return count > 1 ? `오피스텔 ${count}개 건물` : [...names][0] || "오피스텔";
  if (housingType === "detached_multi") return count > 1 ? `단독/다가구 ${count}개 건물` : [...names][0] || "단독/다가구";
  return count > 1 ? `빌라·다세대 ${count}개 건물` : [...names][0] || "빌라·다세대";
}

function compareDealPrice(a: MoveBudgetDeal, b: MoveBudgetDeal): number {
  return a.amount - b.amount || (a.monthlyRent ?? 0) - (b.monthlyRent ?? 0);
}

function toCandidates(rows: RtmsDealRecord[]): MoveBudgetCandidate[] {
  const byGroup = new Map<string, CandidateAccumulator>();

  for (const row of rows) {
    if (!isMoveDealType(row.deal_type) || !isMoveHousingType(row.housing_type)) continue;
    const amount = Number(row.amount_krw ?? 0);
    if (amount <= 0) continue;

    const sido = row.city_label?.trim() || "";
    const sigungu = row.district_label?.trim() || "";
    const dong = row.dong?.trim() || "";
    const key = `${sido}:${sigungu}:${dong}:${row.housing_type}:${row.deal_type}`;
    const areaSqm = numberValue(row.area_sqm);
    const recentMonth = row.deal_yyyymm || row.deal_date?.slice(0, 7) || "";
    const existing = byGroup.get(key);
    const buildingName = row.building_name?.trim();
    const contract = normalizeContractType(row.raw);
    const deal: MoveBudgetDeal = {
      id: String(row.id),
      amount,
      monthlyRent: row.monthly_rent_krw ?? undefined,
      areaSqm,
      dealMonth: recentMonth,
      dealDate: row.deal_date ?? `${recentMonth}-01`,
      buildingName: buildingName || "단지명 미상",
      contractType: contract.type,
      contractLabel: contract.label,
    };

    if (!existing) {
      byGroup.set(key, {
        id: key,
        sido,
        sigungu,
        dong,
        housingType: row.housing_type,
        dealType: row.deal_type,
        amount,
        monthlyRent: row.monthly_rent_krw ?? undefined,
        areaSqm,
        dealCount: 1,
        recentMonth,
        buildingHint: "",
        representativeBuildingName: deal.buildingName,
        deals: [deal],
        buildingNames: new Set(buildingName ? [buildingName] : []),
      });
      continue;
    }

    existing.dealCount += 1;
    existing.deals.push(deal);
    if (buildingName) existing.buildingNames.add(buildingName);
    if (recentMonth > existing.recentMonth) existing.recentMonth = recentMonth;
    const currentRepresentative: MoveBudgetDeal = {
      id: existing.id,
      amount: existing.amount,
      monthlyRent: existing.monthlyRent,
      areaSqm: existing.areaSqm,
      dealMonth: existing.recentMonth,
      dealDate: `${existing.recentMonth}-01`,
      buildingName: existing.representativeBuildingName || "단지명 미상",
      contractType: "unknown",
      contractLabel: "미상",
    };
    if (compareDealPrice(deal, currentRepresentative) < 0) {
      existing.amount = deal.amount;
      existing.monthlyRent = deal.monthlyRent;
      existing.areaSqm = areaSqm || existing.areaSqm;
      existing.representativeBuildingName = deal.buildingName;
    }
  }

  return [...byGroup.values()]
    .map(({ buildingNames, ...candidate }) => ({
      ...candidate,
      deals: [...candidate.deals].sort(compareDealPrice),
      buildingHint: buildingHint(candidate.housingType, buildingNames),
    }))
    .sort((a, b) => b.dealCount - a.dealCount || a.amount - b.amount);
}

export async function getMoveBudgetCandidates(
  supabase: SupabaseClient,
  options?: MoveBudgetCandidateFilters
): Promise<MoveBudgetCandidate[]> {
  const monthsBack = Math.min(Math.max(Math.round(options?.monthsBack ?? 2), 1), 24);
  const cutoff = monthsAgoDate(monthsBack);
  const rows: RtmsDealRecord[] = [];
  const dealTypes = (options?.dealTypes ?? []).filter(isMoveDealType);
  const housingTypes = (options?.housingTypes ?? []).filter(isMoveHousingType);
  const regionKeys = (options?.regionKeys ?? [])
    .filter((key) => key !== ALL_REGION_KEY)
    .map((key) => REGION_KEY_TO_DB_KEY.get(key))
    .filter((key): key is string => Boolean(key));
  const budgetMin = Number.isFinite(options?.budgetMin) ? Math.max(0, Math.round(options?.budgetMin ?? 0)) : undefined;
  const budgetMax = Number.isFinite(options?.budgetMax) ? Math.max(0, Math.round(options?.budgetMax ?? 0)) : undefined;
  const monthlyMin = Number.isFinite(options?.monthlyMin) ? Math.max(0, Math.round(options?.monthlyMin ?? 0)) : undefined;
  const monthlyMax = Number.isFinite(options?.monthlyMax) ? Math.max(0, Math.round(options?.monthlyMax ?? 0)) : undefined;

  for (let from = 0; from < RTMS_DEALS_MAX_ROWS; from += RTMS_DEALS_PAGE_SIZE) {
    let query = supabase
      .from("demand_rtms_deals")
      .select("id, city_label, district_label, dong, building_name, housing_type, deal_type, amount_krw, monthly_rent_krw, area_sqm, deal_yyyymm, deal_date, raw")
      .gte("deal_date", cutoff)
      .order("deal_date", { ascending: false });

    if (dealTypes.length > 0) query = query.in("deal_type", dealTypes);
    if (housingTypes.length > 0) query = query.in("housing_type", housingTypes);
    if (regionKeys.length > 0) query = query.in("region_key", regionKeys);
    if (budgetMin != null) query = query.gte("amount_krw", budgetMin);
    if (budgetMax != null) query = query.lte("amount_krw", budgetMax);
    if (dealTypes.length === 1 && dealTypes[0] === "monthly") {
      if (monthlyMin != null) query = query.gte("monthly_rent_krw", monthlyMin);
      if (monthlyMax != null) query = query.lte("monthly_rent_krw", monthlyMax);
    }

    const { data, error } = await query.range(from, from + RTMS_DEALS_PAGE_SIZE - 1);

    if (error) return [];
    rows.push(...(data as RtmsDealRecord[] | null ?? []));
    if (!data?.length || data.length < RTMS_DEALS_PAGE_SIZE) break;
  }

  if (!rows.length) return [];
  return toCandidates(rows);
}
