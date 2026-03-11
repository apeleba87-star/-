import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { PAY_UNIT_LABELS } from "@/lib/listings/wage";
import type { PayUnit } from "@/lib/listings/types";
import MarketComparisonBox from "@/components/listings/MarketComparisonBox";
import ContactButtons from "@/components/listings/ContactButtons";
import SellerCard from "@/components/listings/SellerCard";

export const revalidate = 60;

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !listing) notFound();

  const [benchRes, profileRes, metricsRes, categoriesRes, closedCountRes, sellerListingsRes] = await Promise.all([
    listing.category_main_id
      ? (() => {
          const q = supabase
            .from("market_benchmarks")
            .select("sample_count, average_pay, average_normalized_daily_wage")
            .eq("region", listing.region)
            .eq("category_main_id", listing.category_main_id)
            .eq("pay_unit", listing.pay_unit);
          return listing.category_sub_id
            ? q.eq("category_sub_id", listing.category_sub_id).maybeSingle()
            : q.is("category_sub_id", null).maybeSingle();
        })()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("profiles").select("display_name").eq("id", listing.user_id).single(),
    supabase.from("seller_metrics").select("*").eq("user_id", listing.user_id).single(),
    supabase.from("categories").select("id, name"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", listing.user_id).eq("status", "closed"),
    supabase.from("listings").select("id").eq("user_id", listing.user_id),
  ]);

  const sellerListingIds = (sellerListingsRes.data ?? []).map((r) => r.id);
  const reviewsRes =
    sellerListingIds.length > 0
      ? await supabase
          .from("listing_reviews")
          .select("id, listing_id, rating, comment, created_at")
          .in("listing_id", sellerListingIds)
          .order("created_at", { ascending: false })
          .limit(10)
      : { data: [] as { id: string; listing_id: string; rating: number; comment: string | null; created_at: string }[] };

  const bench = benchRes.data;
  const profile = profileRes.data;
  const metrics = metricsRes.data;
  const categories = categoriesRes.data ?? [];
  const completedSalesCount = closedCountRes.count ?? 0;
  const sellerReviews = reviewsRes.data ?? [];
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const categoryMainName =
    (listing.category_main_id && categoryNameById.get(listing.category_main_id)) ??
    listing.category_main ??
    "—";
  const categorySubName =
    listing.custom_subcategory_text?.trim() ||
    (listing.category_sub_id ? categoryNameById.get(listing.category_sub_id) : null) ||
    listing.category_sub ||
    null;

  const displayTitle = listing.status === "closed" ? `(마감) ${listing.title}` : listing.title;
  const payUnitLabel = PAY_UNIT_LABELS[listing.pay_unit as PayUnit];
  const normalizedDaily = listing.normalized_daily_wage != null ? Number(listing.normalized_daily_wage) : Number(listing.pay_amount);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/listings" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← 현장 거래 목록
      </Link>

      <article className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">{displayTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {listing.region} · {categoryMainName}
            {categorySubName ? ` / ${categorySubName}` : ""}
            {listing.work_date
              ? ` · 일정 ${new Date(listing.work_date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}`
              : ""}
          </p>
        </header>

        <ContactButtons phone={listing.contact_phone} />

        {categorySubName === "계단청소" && (() => {
          const s = listing as { stairs_floors?: number | null; visits_per_week?: number | null; stairs_restroom_count?: number | null; stairs_has_recycle?: boolean; stairs_has_corridor?: boolean; stairs_elevator?: boolean; stairs_parking?: boolean; stairs_window?: boolean };
          const hasStairsInfo = s.stairs_floors != null || s.visits_per_week != null || s.stairs_restroom_count != null || s.stairs_has_recycle || s.stairs_has_corridor || s.stairs_elevator || s.stairs_parking || s.stairs_window;
          return hasStairsInfo ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-800">계단 청소 현장 정보</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                {s.stairs_floors != null && <li>· 층수: {s.stairs_floors}층</li>}
                {s.visits_per_week != null && <li>· 주 회수: {s.visits_per_week}회</li>}
                {s.stairs_restroom_count != null && s.stairs_restroom_count > 0 && <li>· 화장실: {s.stairs_restroom_count}개</li>}
                {s.stairs_has_recycle && <li>· 분리수거 있음</li>}
                {s.stairs_has_corridor && <li>· 복도 청소 있음</li>}
                {s.stairs_elevator && <li>· 엘리베이터 청소</li>}
                {s.stairs_parking && <li>· 주차장 청소</li>}
                {s.stairs_window && <li>· 창틀 먼지 청소</li>}
              </ul>
            </section>
          ) : null;
        })()}

        <MarketComparisonBox
          currentPay={normalizedDaily}
          averagePay={bench?.average_normalized_daily_wage ?? null}
          sampleCount={bench?.sample_count ?? 0}
          payUnitLabel={payUnitLabel}
        />

        {listing.body && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-800">상세 내용</h2>
            <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{listing.body}</div>
          </section>
        )}

        <SellerCard
          displayName={profile?.display_name ?? null}
          sellerGrade={metrics?.seller_grade ?? null}
          completionRate={metrics?.completion_rate ?? null}
          reviewRating={metrics?.average_review_rating ?? null}
          reviewCount={metrics?.total_review_count ?? 0}
          completedSalesCount={completedSalesCount}
          incidentReportCount={metrics?.incident_report_count ?? 0}
        />

        {sellerReviews.length > 0 && (
          <section id="seller-reviews" className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-800">이 판매자의 후기</h2>
            <ul className="mt-3 space-y-3">
              {sellerReviews.map((rev) => (
                <li key={rev.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500" aria-hidden>
                      {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                    </span>
                    <span className="text-sm text-slate-500">
                      {new Date(rev.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {rev.comment && <p className="mt-1 text-sm text-slate-700">{rev.comment}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}
