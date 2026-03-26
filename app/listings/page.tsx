import { createClient, createServerSupabase } from "@/lib/supabase-server";
import ListingCard from "@/components/listings/ListingCard";
import ListingsPageHeader from "@/components/listings/ListingsPageHeader";
import ListingsSortFilter from "@/components/listings/ListingsSortFilter";
import Link from "next/link";
import type { PayUnit } from "@/lib/listings/types";
import { getActiveListingsAds } from "@/lib/ads";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";
import { wageGapPercent } from "@/lib/listings/grade";
import { REGION_SIDO_LIST, REGION_GUGUN } from "@/lib/listings/regions";
export const revalidate = 60;

/** 현장거래 전용(usage=listing) 카테고리만 업무 종류 필터 옵션으로, 이름 중복 제거 */
function buildListingWorkTypeOptions(
  categories: { id: string; name: string; parent_id: string | null; sort_order?: number }[]
): { value: string; label: string }[] {
  const mains = categories.filter((c) => c.parent_id == null);
  const subs = categories.filter((c) => c.parent_id != null);
  const byLabel = new Map<string, { value: string; label: string }>();
  for (const c of mains) {
    const label = (c.name || "").trim() || "(이름 없음)";
    if (!byLabel.has(label)) byLabel.set(label, { value: c.id, label });
  }
  for (const c of subs) {
    const label = (c.name || "").trim() || "(이름 없음)";
    if (!byLabel.has(label)) byLabel.set(label, { value: c.id, label });
  }
  return Array.from(byLabel.values()).sort((a, b) => a.label.localeCompare(b.label, "ko"));
}

const SORT_VALUES = ["recommended", "newest", "monthly_high", "monthly_low", "deal_high", "deal_low"] as const;
const LISTING_TYPES = ["sale_regular", "referral_regular", "referral_one_time", "subcontract"] as const;
const STATUS_VALUES = ["open", "closed", "all"] as const;
const VISITS_VALUES = [1, 2, 3, 4, 5, 6, 7] as const;

type BenchmarkKey = string;
function benchmarkKey(
  region: string,
  mainId: string | null,
  subId: string | null,
  unit: string
): BenchmarkKey {
  return `${region}|${mainId ?? ""}|${subId ?? ""}|${unit}`;
}

type PageProps = {
  searchParams: Promise<{ sort?: string; type?: string; status?: string; region?: string; category?: string; visits?: string }>;
};

export default async function ListingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sort =
    (SORT_VALUES.includes(params.sort as (typeof SORT_VALUES)[number]) ? params.sort : "newest") ?? "newest";
  const typeParam = params.type;
  const listingTypeFilter = typeParam && LISTING_TYPES.includes(typeParam as (typeof LISTING_TYPES)[number]) ? typeParam : null;
  const statusParam = params.status;
  const statusFilter =
    (STATUS_VALUES.includes(statusParam as (typeof STATUS_VALUES)[number]) ? statusParam : "open") ?? "open";
  const regionFilter = (() => {
    const r = params.region?.trim();
    if (!r) return null;
    if (REGION_SIDO_LIST.includes(r as (typeof REGION_SIDO_LIST)[number])) return r;
    const space = r.indexOf(" ");
    if (space > 0) {
      const sido = r.slice(0, space);
      const gugun = r.slice(space + 1);
      if (REGION_SIDO_LIST.includes(sido as (typeof REGION_SIDO_LIST)[number])) {
        const guguns = REGION_GUGUN[sido as (typeof REGION_SIDO_LIST)[number]];
        if (guguns?.includes(gugun)) return r;
      }
    }
    return null;
  })();
  const categoryFilter = params.category?.trim() || null;
  const visitsFilter =
    params.visits != null && VISITS_VALUES.includes(parseInt(params.visits, 10) as (typeof VISITS_VALUES)[number])
      ? parseInt(params.visits, 10)
      : null;

  const supabase = createClient();
  const authSupabase = await createServerSupabase();
  const { data: { user } } = await authSupabase.auth.getUser();

  const fieldDealTypes = ["referral_regular", "referral_one_time", "sale_regular", "subcontract"];
  let query = supabase
    .from("listings")
    .select("id, user_id, title, status, region, listing_type, category_main_id, category_sub_id, custom_subcategory_text, category_main, category_sub, pay_amount, pay_unit, normalized_daily_wage, monthly_amount, deal_amount, sale_multiplier, visits_per_week, created_at")
    .in("listing_type", fieldDealTypes)
    .limit(50);

  if (statusFilter === "open") query = query.eq("status", "open");
  else if (statusFilter === "closed") query = query.eq("status", "closed");
  if (listingTypeFilter) query = query.eq("listing_type", listingTypeFilter);
  if (regionFilter) {
    if (regionFilter.includes(" ")) {
      query = query.eq("region", regionFilter);
    } else {
      query = query.ilike("region", `${regionFilter}%`);
    }
  }
  if (categoryFilter) {
    query = query.or(`category_main_id.eq.${categoryFilter},category_sub_id.eq.${categoryFilter}`);
  }
  if (visitsFilter != null) query = query.eq("visits_per_week", visitsFilter);

  if (sort === "newest") query = query.order("created_at", { ascending: false });

  const [listingsRes, benchmarksRes, metricsRes, categoriesRes, cltRes] = await Promise.all([
    query,
    supabase
      .from("market_benchmarks")
      .select("region, category_main_id, category_sub_id, pay_unit, sample_count, average_normalized_daily_wage"),
    supabase.from("seller_metrics").select("user_id, seller_grade"),
    supabase.from("categories").select("id, name, parent_id, slug, usage").eq("is_active", true).in("usage", ["listing", "default"]),
    supabase.from("category_listing_types").select("category_id, listing_type"),
  ]);

  const listings = listingsRes.data ?? [];
  const benchmarks = benchmarksRes.data ?? [];
  const metrics = metricsRes.data ?? [];
  const categories = (categoriesRes.data ?? []) as {
    id: string;
    name: string;
    parent_id: string | null;
    slug: string | null;
    usage?: string | null;
  }[];

  const categoryListingTypesMap: Record<string, string[]> = {};
  for (const row of cltRes.data ?? []) {
    const id = (row as { category_id: string; listing_type: string }).category_id;
    const lt = (row as { category_id: string; listing_type: string }).listing_type;
    if (!categoryListingTypesMap[id]) categoryListingTypesMap[id] = [];
    categoryListingTypesMap[id].push(lt);
  }

  const categoryNameById = new Map<string, string>(categories.map((c) => [c.id, c.name]));
  const listingOnlyCategories = categories.filter((c) => c.usage === "listing");
  const categoriesForWorkTypeFilter =
    listingTypeFilter && Object.keys(categoryListingTypesMap).length > 0
      ? listingOnlyCategories.filter((c) => {
          const types = categoryListingTypesMap[c.id];
          return !types || types.length === 0 || types.includes(listingTypeFilter);
        })
      : listingOnlyCategories;
  const workTypeOptions = buildListingWorkTypeOptions(categoriesForWorkTypeFilter);
  const benchmarkMap = new Map<BenchmarkKey, (typeof benchmarks)[0]>();
  for (const b of benchmarks) {
    benchmarkMap.set(
      benchmarkKey(b.region, b.category_main_id, b.category_sub_id ?? null, b.pay_unit),
      b
    );
  }
  const metricsByUser = new Map(metrics.map((m) => [m.user_id, m]));

  let listingsWithMeta = listings.map((l) => {
    const key = benchmarkKey(
      l.region,
      l.category_main_id ?? null,
      l.category_sub_id ?? null,
      l.pay_unit
    );
    const bench = benchmarkMap.get(key);
    const seller = metricsByUser.get(l.user_id);
    const categoryMainName =
      (l.category_main_id && categoryNameById.get(l.category_main_id)) ?? l.category_main ?? "—";
    const categorySubName =
      l.custom_subcategory_text?.trim() ||
      (l.category_sub_id ? categoryNameById.get(l.category_sub_id) : null) ||
      l.category_sub ||
      null;
    const avgWage = bench?.average_normalized_daily_wage != null ? Number(bench.average_normalized_daily_wage) : null;
    const normDaily = l.normalized_daily_wage != null ? Number(l.normalized_daily_wage) : null;
    const monthlyVal = l.monthly_amount != null ? Number(l.monthly_amount) : ((l.pay_unit as string) === "monthly" && l.pay_amount != null ? Number(l.pay_amount) : null);
    const dealVal = l.deal_amount != null ? Number(l.deal_amount) : null;
    const gapPercent = wageGapPercent(normDaily, avgWage);
    return {
      ...l,
      category_main_name: categoryMainName,
      category_sub_name: categorySubName,
      average_normalized_daily_wage: avgWage,
      sample_count: bench?.sample_count ?? 0,
      seller_grade: seller?.seller_grade ?? null,
      _gapPercent: gapPercent,
      _monthlyVal: monthlyVal,
      _dealVal: dealVal,
    };
  });

  if (sort === "recommended") {
    listingsWithMeta = [...listingsWithMeta].sort((a, b) => {
      const score = (row: (typeof listingsWithMeta)[0]) => {
        if (row._gapPercent != null) return -row._gapPercent;
        if (row._monthlyVal != null && row._monthlyVal > 0) return -row._monthlyVal;
        return -Infinity;
      };
      return score(b) - score(a);
    });
  } else if (sort === "newest") {
    listingsWithMeta = [...listingsWithMeta].sort(
      (a, b) => new Date((b as { created_at?: string }).created_at ?? 0).getTime() - new Date((a as { created_at?: string }).created_at ?? 0).getTime()
    );
  } else if (sort === "monthly_high") {
    listingsWithMeta = [...listingsWithMeta].sort((a, b) => {
      const ma = a._monthlyVal ?? -Infinity;
      const mb = b._monthlyVal ?? -Infinity;
      return mb - ma;
    });
  } else if (sort === "monthly_low") {
    listingsWithMeta = [...listingsWithMeta].sort((a, b) => {
      const ma = a._monthlyVal ?? Infinity;
      const mb = b._monthlyVal ?? Infinity;
      return ma - mb;
    });
  } else if (sort === "deal_high") {
    listingsWithMeta = [...listingsWithMeta].sort((a, b) => {
      const da = a._dealVal ?? -Infinity;
      const db = b._dealVal ?? -Infinity;
      return db - da;
    });
  } else if (sort === "deal_low") {
    listingsWithMeta = [...listingsWithMeta].sort((a, b) => {
      const da = a._dealVal ?? Infinity;
      const db = b._dealVal ?? Infinity;
      return da - db;
    });
  }

  const listingsAds = await getActiveListingsAds();

  return (
    <div className="page-shell py-8 lg:py-10">
      <ListingsPageHeader isLoggedIn={!!user} />

      <ListingsSortFilter
        currentSort={sort}
        currentType={listingTypeFilter}
        currentStatus={statusFilter}
        currentRegion={regionFilter}
        currentCategory={categoryFilter}
        currentVisits={visitsFilter}
        regionSidoOptions={REGION_SIDO_LIST.map((s) => ({ value: s, label: s }))}
        regionGugunBySido={Object.fromEntries(
          REGION_SIDO_LIST.map((sido) => [
            sido,
            (REGION_GUGUN[sido] ?? []).map((g) => ({ value: g, label: g })),
          ])
        )}
        categoryOptions={workTypeOptions}
      />

      {(listingsAds.listings_top?.enabled && (listingsAds.listings_top.campaign || listingsAds.listings_top.script_content)) ? (
        <div className="mb-8">
          <AdSlotRenderer slot={listingsAds.listings_top} variant="card" />
        </div>
      ) : null}

      {listingsWithMeta.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-500">등록된 글이 없습니다.</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            홈으로
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listingsWithMeta.map((l) => (
            <ListingCard
              key={l.id}
              isLoggedIn={!!user}
              id={l.id}
              title={l.title}
              status={l.status}
              region={l.region}
              listingType={l.listing_type}
              categoryMain={l.category_main_name}
              categorySub={l.category_sub_name}
              payAmount={Number(l.pay_amount)}
              payUnit={l.pay_unit as PayUnit}
              monthlyAmount={l.monthly_amount != null ? Number(l.monthly_amount) : null}
              dealAmount={l.deal_amount != null ? Number(l.deal_amount) : null}
              saleMultiplier={l.sale_multiplier != null ? Number(l.sale_multiplier) : null}
              visitsPerWeek={l.visits_per_week != null ? Number(l.visits_per_week) : null}
              normalizedDailyWage={l.normalized_daily_wage != null ? Number(l.normalized_daily_wage) : null}
              averageNormalizedDailyWage={
                l.average_normalized_daily_wage != null
                  ? Number(l.average_normalized_daily_wage)
                  : null
              }
              sampleCount={l.sample_count ?? 0}
              sellerGrade={l.seller_grade}
              createdAt={l.created_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}
