import { createClient } from "@/lib/supabase-server";
import TendersListWithFilters from "./TendersListWithFilters";
import type { TenderBidCardT } from "@/components/tender/TenderBidCard";

export const revalidate = 60;

export default async function TendersPage() {
  const supabase = createClient();

  // 홈과 동일: 청소·소독방역 관련 공고 전부 (6건 등 누락 방지)
  const { data: relatedTenders } = await supabase
    .from("tenders")
    .select("id, bid_ntce_no, bid_ntce_ord, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_ntce_dt, bid_clse_dt, categories, raw")
    .overlaps("categories", ["cleaning", "disinfection"])
    .order("bid_clse_dt", { ascending: true, nullsFirst: false })
    .limit(300);

  // 전체 목록용: 마감일순 상위 500건
  const { data: allTenders } = await supabase
    .from("tenders")
    .select("id, bid_ntce_no, bid_ntce_ord, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_ntce_dt, bid_clse_dt, categories, raw")
    .order("bid_clse_dt", { ascending: true, nullsFirst: false })
    .limit(500);

  const relatedIds = new Set((relatedTenders ?? []).map((t) => t.id));
  const merged = [
    ...(relatedTenders ?? []),
    ...(allTenders ?? []).filter((t) => !relatedIds.has(t.id)),
  ]
    .sort(
      (a, b) =>
        new Date(a.bid_clse_dt ?? 0).getTime() - new Date(b.bid_clse_dt ?? 0).getTime()
    ) as TenderBidCardT[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">입찰 공고 목록</h1>
          <p className="text-slate-600">
            관심있는 입찰을 선택해서 상세 정보를 확인하세요
          </p>
        </header>

        <TendersListWithFilters tenders={merged} />
      </div>
    </div>
  );
}
