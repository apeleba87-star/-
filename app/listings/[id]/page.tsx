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

  const [benchRes, profileRes, metricsRes, categoriesRes] = await Promise.all([
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
  ]);

  const bench = benchRes.data;
  const profile = profileRes.data;
  const metrics = metricsRes.data;
  const categories = categoriesRes.data ?? [];
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

  const displayTitle = listing.status === "closed" ? `마감)) ${listing.title}` : listing.title;
  const payUnitLabel = PAY_UNIT_LABELS[listing.pay_unit as PayUnit];
  const normalizedDaily = listing.normalized_daily_wage != null ? Number(listing.normalized_daily_wage) : Number(listing.pay_amount);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/listings" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← 목록
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
        />
      </article>
    </div>
  );
}
