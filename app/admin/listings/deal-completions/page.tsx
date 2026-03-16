import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import DealCompletionRow from "./DealCompletionRow";

export default async function AdminDealCompletionsPage() {
  const supabase = await createServerSupabase();

  const { data: incidents } = await supabase
    .from("listing_incidents")
    .select("id, listing_id, reporter_id, created_at")
    .eq("incident_type", "deal_completed")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: false });

  const listingIds = [...new Set((incidents ?? []).map((i) => i.listing_id))];
  const reporterIds = [...new Set((incidents ?? []).map((i) => i.reporter_id).filter(Boolean) as string[])];

  const [listingsRes, profilesRes] = await Promise.all([
    listingIds.length
      ? supabase.from("listings").select("id, title").in("id", listingIds)
      : Promise.resolve({ data: [] }),
    reporterIds.length
      ? supabase.from("profiles").select("id, email, display_name").in("id", reporterIds)
      : Promise.resolve({ data: [] }),
  ]);

  const listings = listingsRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const listingById = new Map(listings.map((l) => [l.id, l]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">거래 완료 신고 확인</h1>
      <p className="mb-6 text-sm text-slate-600">
        사용자가 신고한 거래 완료 건을 확인한 뒤 승인하면 해당 글이 마감 처리됩니다.
      </p>
      {!incidents?.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          대기 중인 거래 완료 신고가 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-slate-700">신고 일시</th>
                <th className="px-4 py-3 font-semibold text-slate-700">현장거래 글</th>
                <th className="px-4 py-3 font-semibold text-slate-700">신고자</th>
                <th className="px-4 py-3 font-semibold text-slate-700">조치</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => {
                const listing = listingById.get(inc.listing_id);
                const profile = inc.reporter_id ? profileById.get(inc.reporter_id) : null;
                const reporterDisplay =
                  profile?.display_name?.trim() || profile?.email || (inc.reporter_id ? `${inc.reporter_id.slice(0, 8)}…` : "—");
                return (
                  <DealCompletionRow
                    key={inc.id}
                    incidentId={inc.id}
                    listingId={inc.listing_id}
                    listingTitle={listing?.title?.trim() || "(제목 없음)"}
                    reporterDisplay={reporterDisplay}
                    createdAt={inc.created_at}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4">
        <Link href="/admin" className="text-sm text-slate-600 hover:underline">
          ← 대시보드
        </Link>
      </p>
    </div>
  );
}
