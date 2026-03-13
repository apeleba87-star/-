import { createClient } from "@/lib/supabase-server";
import type { TenderBidCardT } from "@/components/tender/TenderBidCard";
import TendersListWithFilters from "./TendersListWithFilters";

export const revalidate = 60;

const SORT_OPTIONS = ["posted", "deadline", "amount-high", "amount-low"] as const;
const REGION_OPTIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원",
  "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

type PageProps = { searchParams: Promise<{ industry?: string; region?: string; sort?: string }> };

export default async function TendersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const industryCodes = (params.industry ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const region = params.region?.trim() && REGION_OPTIONS.includes(params.region as (typeof REGION_OPTIONS)[number])
    ? params.region
    : null;
  const sort = SORT_OPTIONS.includes((params.sort ?? "posted") as (typeof SORT_OPTIONS)[number])
    ? (params.sort as (typeof SORT_OPTIONS)[number])
    : "posted";

  const supabase = createClient();

  let tenderIds: string[] | null = null;
  if (industryCodes.length > 0) {
    const { data: idRows } = await supabase
      .from("tender_industries")
      .select("tender_id")
      .in("industry_code", industryCodes);
    tenderIds = [...new Set((idRows ?? []).map((r) => r.tender_id))];
    if (tenderIds.length === 0) {
      tenderIds = [];
    }
  }

  const industriesRes = await supabase
    .from("industries")
    .select("code, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  let tendersRes: { data: unknown[] | null };
  if (tenderIds !== null && tenderIds.length === 0) {
    tendersRes = { data: [] };
  } else {
    let q = supabase
      .from("tenders")
      .select("id, bid_ntce_no, bid_ntce_ord, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_ntce_dt, bid_clse_dt, categories, raw, primary_industry_code, region_sido_list, tender_industries(industry_code)");
    if (tenderIds !== null && tenderIds.length > 0) q = q.in("id", tenderIds);
    if (region) q = q.contains("region_sido_list", [region]);
    const orderKey = sort === "posted" ? "bid_ntce_dt" : sort === "deadline" ? "bid_clse_dt" : "base_amt";
    const orderAsc = sort === "amount-low";
    tendersRes = await q.order(orderKey, { ascending: orderAsc, nullsFirst: false }).limit(500);
  }

  const industries = industriesRes.data ?? [];
  const tendersRaw = Array.isArray(tendersRes.data) ? tendersRes.data : [];
  const tenders: TenderBidCardT[] = tendersRaw.map((t) => {
    const row = t as Record<string, unknown> & { tender_industries?: { industry_code: string }[] };
    const { tender_industries, ...rest } = row;
    return { ...rest, tender_industries: tender_industries ?? [] } as TenderBidCardT;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">입찰 공고 목록</h1>
          <p className="text-slate-600">
            업종명으로 선택하면 업종 코드 기준으로 수집된 공고가 필터됩니다. 지역·정렬로 더 좁혀보세요.
          </p>
        </header>

        <TendersListWithFilters
          tenders={tenders}
          industries={industries}
          initialIndustryCodes={industryCodes}
          initialRegion={region ?? "전체 지역"}
          initialSort={sort}
        />
      </div>
    </div>
  );
}
