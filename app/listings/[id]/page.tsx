import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { PAY_UNIT_LABELS } from "@/lib/listings/wage";
import type { PayUnit } from "@/lib/listings/types";
import { getListingBenchmarksForListing } from "@/lib/listings/listing-benchmarks";
import MarketComparisonBox from "@/components/listings/MarketComparisonBox";
import ListingPriceReferenceBox from "@/components/listings/ListingPriceReferenceBox";
import ContactButtons from "@/components/listings/ContactButtons";
import SellerCard from "@/components/listings/SellerCard";
import ReportDealCompletedButton from "@/components/listings/ReportDealCompletedButton";
import ListingDetailBackground from "@/components/listings/ListingDetailBackground";
import { MapPin, Tag, Calendar, AlertTriangle, Sparkles } from "lucide-react";

export const revalidate = 60;

const LISTING_TYPE_LABELS: Record<string, string> = {
  sale_regular: "정기 매매",
  referral_regular: "정기 소개",
  referral_one_time: "일회 소개",
  subcontract: "도급",
};

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();
  const authSupabase = await createServerSupabase();
  const { data: { user } } = await authSupabase.auth.getUser();

  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !listing) notFound();

  const isMonthlyPayUnit = listing.pay_unit === "monthly";
  const isSaleRegularOrSub =
    listing.listing_type === "sale_regular" || listing.listing_type === "subcontract";
  const isMonthly = isMonthlyPayUnit || isSaleRegularOrSub;
  const [benchRes, listingBenchmarksRes, profileRes, metricsRes, categoriesRes, closedCountRes, dealIncidentRes, currentUserProfileRes] = await Promise.all([
    !isMonthly && listing.category_main_id
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
    isMonthly && listing.category_main_id
      ? getListingBenchmarksForListing(supabase, {
          region: listing.region,
          listing_type: listing.listing_type,
          category_main_id: listing.category_main_id,
          category_sub_id: listing.category_sub_id ?? null,
        })
      : Promise.resolve({ rows: [], fallback_level: "none" as const }),
    supabase.from("profiles").select("display_name").eq("id", listing.user_id).single(),
    supabase.from("seller_metrics").select("*").eq("user_id", listing.user_id).single(),
    supabase.from("categories").select("id, name").in("usage", ["listing", "default"]),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", listing.user_id).eq("status", "closed"),
    supabase
      .from("listing_incidents")
      .select("id, approval_status")
      .eq("listing_id", id)
      .eq("incident_type", "deal_completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    user ? authSupabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const bench = benchRes.data;
  const listingBenchmarks = listingBenchmarksRes.rows ?? [];
  const listingBenchmarkFallback = listingBenchmarksRes.fallback_level ?? "none";
  const monthlyRow = listingBenchmarks.find((r) => r.metric_type === "monthly");
  const profile = profileRes.data;
  const metrics = metricsRes.data;
  const categories = categoriesRes.data ?? [];
  const completedSalesCount = closedCountRes.count ?? 0;
  const dealIncident = dealIncidentRes.data;
  const dealCompletionStatus =
    !dealIncident || dealIncident.approval_status === null
      ? ("none" as const)
      : dealIncident.approval_status === "pending"
        ? ("pending" as const)
        : dealIncident.approval_status === "rejected"
          ? ("rejected" as const)
          : ("none" as const);
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

  const displayTitle = listing.title;
  const isClosed = listing.status === "closed";
  const payUnitLabel = PAY_UNIT_LABELS[listing.pay_unit as PayUnit];
  const normalizedDaily = listing.normalized_daily_wage != null ? Number(listing.normalized_daily_wage) : Number(listing.pay_amount);
  const workDateLabel = listing.work_date
    ? new Date(listing.work_date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const listingTypeLabel = listing.listing_type ? LISTING_TYPE_LABELS[listing.listing_type] ?? listing.listing_type : null;
  const isExternal = (listing as { is_external?: boolean }).is_external;
  const isOwner = user?.id === listing.user_id && !isExternal;
  const currentUserRole = (currentUserProfileRes?.data as { role?: string } | null)?.role;
  const isAdmin = currentUserRole === "admin" || currentUserRole === "editor";
  const canEdit = isOwner || (isExternal && isAdmin);

  return (
    <ListingDetailBackground>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-md transition-all hover:scale-[1.02] hover:border-blue-300 hover:shadow-lg"
          >
            ← 현장 거래 목록
          </Link>
          {canEdit && (
            <Link
              href={`/listings/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-md transition-all hover:scale-[1.02] hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-lg"
            >
              수정
            </Link>
          )}
        </div>

        <article className="space-y-6">
          <header className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
                    {displayTitle}
                  </h1>
                  {isClosed && (
                    <span className="rounded-full bg-slate-200 px-3 py-0.5 text-sm font-medium text-slate-700">
                      마감
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                    <MapPin className="h-3.5 w-3.5" />
                    {listing.region}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
                    <Tag className="h-3.5 w-3.5" />
                    {categoryMainName}
                    {categorySubName ? ` / ${categorySubName}` : ""}
                  </span>
                  {workDateLabel && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                      <Calendar className="h-3.5 w-3.5" />
                      {workDateLabel}
                    </span>
                  )}
                  {listingTypeLabel && (
                    <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {listingTypeLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </header>

          {isExternal && (
            <div
              className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-900"
              role="alert"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                이 글은 외부 커뮤니티에서 가져온 정보입니다. 참여 전 반드시 <strong>직접 연락하여</strong> 내용을 확인하세요.
              </span>
            </div>
          )}

          <ContactButtons phone={listing.contact_phone} variant="listingDetail" />

        {isMonthly && (() => {
          const L = listing as {
            pay_amount?: number | null;
            monthly_amount?: number | null;
            deal_amount?: number | null;
            sale_multiplier?: number | null;
            area_pyeong?: number | null;
            visits_per_week?: number | null;
          };
          const monthly = L.monthly_amount ?? (isMonthlyPayUnit && L.pay_amount != null ? Number(L.pay_amount) : (isSaleRegularOrSub && L.pay_amount != null ? Number(L.pay_amount) : null));
          const deal = L.deal_amount != null ? Number(L.deal_amount) : null;
          const mult = L.sale_multiplier != null ? Number(L.sale_multiplier) : null;
          const area = L.area_pyeong != null ? Number(L.area_pyeong) : null;
          const visits = L.visits_per_week != null ? Number(L.visits_per_week) : null;
          const hasAny = (monthly != null && monthly > 0) || (deal != null && deal > 0) || (mult != null && mult > 0) || (area != null && area > 0) || (visits != null && visits >= 1 && visits <= 7);
          if (!hasAny) return null;
          const fmt = (n: number) => n.toLocaleString();
          type Item = { icon: string; iconColor: string; label: string; value: string };
          const estimatedDeal =
            monthly != null && monthly > 0 && mult != null && mult > 0 && mult <= 100
              ? Math.round(monthly * mult)
              : null;
          const dealEqualsEstimated =
            deal != null && estimatedDeal != null && deal === estimatedDeal;
          const monthlyItem: Item | null =
            monthly != null && monthly > 0
              ? { icon: "💰", iconColor: "text-emerald-600", label: "월 수금", value: `${fmt(monthly)}원` }
              : null;
          const dealItem: Item | null =
            deal != null && deal > 0 && !dealEqualsEstimated
              ? { icon: "🏷️", iconColor: "text-violet-600", label: "매매가", value: `${fmt(deal)}원` }
              : null;
          const estimatedItem: Item | null =
            estimatedDeal != null && !dealEqualsEstimated
              ? { icon: "📈", iconColor: "text-indigo-600", label: "예상 매매가", value: `${fmt(estimatedDeal)}원 (월수금×배수)` }
              : null;
          const combinedDealItem: Item | null =
            dealEqualsEstimated && deal != null && deal > 0
              ? { icon: "🏷️", iconColor: "text-violet-600", label: "매매가 · 예상 매매가", value: `${fmt(deal)}원 (월수금×배수)` }
              : null;
          const multItem: Item | null =
            mult != null && mult > 0 && mult <= 100
              ? { icon: "📊", iconColor: "text-blue-600", label: "배수", value: String(mult) }
              : null;
          const areaItem: Item | null =
            area != null && area > 0
              ? { icon: "📐", iconColor: "text-orange-600", label: "평수", value: `${area}평` }
              : null;
          const visitsItem: Item | null =
            visits != null && visits >= 1 && visits <= 7
              ? { icon: "🔄", iconColor: "text-pink-600", label: "주 회수", value: `주 ${visits}회` }
              : null;
          const items: Item[] = [
            monthlyItem,
            combinedDealItem ?? dealItem,
            combinedDealItem ? null : estimatedItem,
            multItem,
            areaItem,
            visitsItem,
          ].filter((x): x is Item => x != null);
          return (
            <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 shadow-xl shadow-blue-200/20">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                현장 정보
              </h2>
              <ul className="mt-4 space-y-2">
                {items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-4 rounded-lg border border-blue-100 bg-white px-3 py-2.5 transition-all hover:translate-x-1"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className={`shrink-0 text-lg ${item.iconColor}`}>{item.icon}</span>
                      <span className="text-sm text-slate-600">{item.label}</span>
                    </div>
                    <span className="shrink-0 text-base font-bold text-slate-900 tabular-nums">{item.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

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

        {isMonthly ? (
          <ListingPriceReferenceBox
            variant="listingDetail"
            currentAmount={Number(listing.pay_amount)}
            medianValue={monthlyRow?.median_value ?? null}
            avgValue={monthlyRow?.avg_value ?? null}
            sampleCount={monthlyRow?.sample_count ?? 0}
            fallbackLevel={listingBenchmarkFallback}
            metricLabel="월 수금"
          />
        ) : (
          <MarketComparisonBox
            variant="listingDetail"
            currentPay={normalizedDaily}
            averagePay={bench?.average_normalized_daily_wage ?? null}
            sampleCount={bench?.sample_count ?? 0}
            payUnitLabel={payUnitLabel}
          />
        )}

        {listing.body && (
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-xl transition-shadow hover:shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-800">📝 상세 내용</h2>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{listing.body}</div>
          </section>
        )}

        {listing.status === "open" && (
          <>
            {dealCompletionStatus === "pending" && (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                거래 완료 신고가 접수되었습니다. 관리자 확인 후 마감 처리됩니다.
              </div>
            )}
            {dealCompletionStatus === "rejected" && (
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                거래 완료 신고가 반려되었습니다. 필요 시 다시 신고할 수 있습니다.
              </div>
            )}
            {(dealCompletionStatus === "none" || dealCompletionStatus === "rejected") && (
              <ReportDealCompletedButton listingId={listing.id} />
            )}
          </>
        )}

        <SellerCard
          variant="listingDetail"
          displayName={profile?.display_name ?? null}
          sellerGrade={metrics?.seller_grade ?? null}
          completionRate={metrics?.completion_rate ?? null}
          reviewRating={metrics?.average_review_rating ?? null}
          reviewCount={metrics?.total_review_count ?? 0}
          completedSalesCount={completedSalesCount}
          incidentReportCount={metrics?.incident_report_count ?? 0}
        />
      </article>
      </div>
    </ListingDetailBackground>
  );
}
