import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MoveBudgetCandidate,
  MoveBudgetDeal,
  MoveContractType,
  MoveDealType,
  MoveHousingType,
} from "@/lib/move/budget-types";

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
    .sort((a, b) => b.dealCount - a.dealCount || a.amount - b.amount)
    .slice(0, 1200);
}

export async function getMoveBudgetCandidates(
  supabase: SupabaseClient,
  options?: { monthsBack?: number }
): Promise<MoveBudgetCandidate[]> {
  const monthsBack = Math.min(Math.max(Math.round(options?.monthsBack ?? 3), 1), 24);
  const cutoff = monthsAgoDate(monthsBack);
  const { data, error } = await supabase
    .from("demand_rtms_deals")
    .select("id, city_label, district_label, dong, building_name, housing_type, deal_type, amount_krw, monthly_rent_krw, area_sqm, deal_yyyymm, deal_date, raw")
    .gte("deal_date", cutoff)
    .order("deal_date", { ascending: false })
    .limit(20000);

  if (error || !data?.length) return [];
  return toCandidates(data as RtmsDealRecord[]);
}
