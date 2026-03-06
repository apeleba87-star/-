import { createClient } from "@/lib/supabase-server";
import ListingCard from "@/components/listings/ListingCard";
import Link from "next/link";
import type { PayUnit } from "@/lib/listings/types";

export const revalidate = 60;

type BenchmarkKey = string;
function benchmarkKey(
  region: string,
  mainId: string | null,
  subId: string | null,
  unit: string
): BenchmarkKey {
  return `${region}|${mainId ?? ""}|${subId ?? ""}|${unit}`;
}

export default async function ListingsPage() {
  const supabase = createClient();

  const [listingsRes, benchmarksRes, metricsRes, categoriesRes] = await Promise.all([
    supabase
      .from("listings")
      .select("id, user_id, title, status, region, category_main_id, category_sub_id, custom_subcategory_text, category_main, category_sub, pay_amount, pay_unit, normalized_daily_wage")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("market_benchmarks")
      .select("region, category_main_id, category_sub_id, pay_unit, sample_count, average_normalized_daily_wage"),
    supabase.from("seller_metrics").select("user_id, seller_grade"),
    supabase.from("categories").select("id, name"),
  ]);

  const listings = listingsRes.data ?? [];
  const benchmarks = benchmarksRes.data ?? [];
  const metrics = metricsRes.data ?? [];
  const categories = categoriesRes.data ?? [];

  const categoryNameById = new Map<string, string>(categories.map((c) => [c.id, c.name]));
  const benchmarkMap = new Map<BenchmarkKey, (typeof benchmarks)[0]>();
  for (const b of benchmarks) {
    benchmarkMap.set(
      benchmarkKey(b.region, b.category_main_id, b.category_sub_id ?? null, b.pay_unit),
      b
    );
  }
  const metricsByUser = new Map(metrics.map((m) => [m.user_id, m]));

  const listingsWithMeta = listings.map((l) => {
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
    return {
      ...l,
      category_main_name: categoryMainName,
      category_sub_name: categorySubName,
      average_normalized_daily_wage: bench?.average_normalized_daily_wage ?? null,
      sample_count: bench?.sample_count ?? 0,
      seller_grade: seller?.seller_grade ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">현장 공유 · 구인</h1>
          <p className="mt-1 text-sm text-slate-600">
            청소업 시장 평균 단가와 비교해 등급을 확인할 수 있습니다.
          </p>
        </div>
        <Link
          href="/listings/new"
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          글 쓰기
        </Link>
      </div>

      {listingsWithMeta.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-500">등록된 글이 없습니다.</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            홈으로
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listingsWithMeta.map((l) => (
            <ListingCard
              key={l.id}
              id={l.id}
              title={l.title}
              status={l.status}
              region={l.region}
              categoryMain={l.category_main_name}
              categorySub={l.category_sub_name}
              payAmount={Number(l.pay_amount)}
              payUnit={l.pay_unit as PayUnit}
              normalizedDailyWage={l.normalized_daily_wage != null ? Number(l.normalized_daily_wage) : null}
              averageNormalizedDailyWage={
                l.average_normalized_daily_wage != null
                  ? Number(l.average_normalized_daily_wage)
                  : null
              }
              sampleCount={l.sample_count ?? 0}
              sellerGrade={l.seller_grade}
            />
          ))}
        </div>
      )}
    </div>
  );
}
