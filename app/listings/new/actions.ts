"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { resolveListingCategory } from "@/lib/listings/resolve-listing-category";

type CreateListingInput = {
  listing_type: string;
  title: string;
  work_date?: string | null;
  body?: string | null;
  region: string;
  category_group: "regular" | "one_time";
  category_preset_key: string;
  category_custom_text?: string | null;
  skill_level?: string | null;
  pay_amount: number;
  pay_unit: string;
  contact_phone: string;
  /** 정기 매매/도급: 월 수금·월 도급금 */
  monthly_amount?: number | null;
  /** 소개: 성사 금액, 매매: 매매가 */
  deal_amount?: number | null;
  area_pyeong?: number | null;
  visits_per_week?: number | null;
  difficulty?: "easy" | "normal" | "hard" | null;
  /** 소개: 견적/현장 확인 필요 여부 */
  estimate_check_required?: boolean;
  /** 소개: 성사 예상 금액. 금액 미정이면 미입력 */
  expected_amount?: number | null;
  /** 소개: 소개비 수수료율 0~100 */
  fee_rate_percent?: number | null;
  /** 정기 매매: 배수. 직접 입력하거나 월수금·매매가로 역산 */
  sale_multiplier?: number | null;
  /** 계단 청소 전용 (category_preset_key === 'stairs') */
  stairs_floors?: number | null;
  stairs_restroom_count?: number | null;
  stairs_has_recycle?: boolean;
  stairs_has_corridor?: boolean;
  stairs_elevator?: boolean;
  stairs_parking?: boolean;
  stairs_window?: boolean;
};

export async function createListing(input: CreateListingInput) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: firstMain } = await supabase
    .from("categories")
    .select("id")
    .is("parent_id", null)
    .eq("is_active", true)
    .limit(1)
    .single();
  const fallbackMainId = firstMain?.id ?? "";
  if (!fallbackMainId) return { ok: false, error: "카테고리를 불러올 수 없습니다." };

  const resolved = await resolveListingCategory(
    supabase,
    input.category_group,
    input.category_preset_key,
    input.category_custom_text,
    fallbackMainId
  );

  const listingType = input.listing_type as string;
  const isReferral = listingType === "referral_regular" || listingType === "referral_one_time";
  const isSaleRegular = listingType === "sale_regular";
  let monthlyForPay = input.monthly_amount ?? null;
  let dealForPay = input.deal_amount ?? null;
  let saleMultiplierToStore = input.sale_multiplier ?? null;
  if (isSaleRegular && (monthlyForPay != null || dealForPay != null || saleMultiplierToStore != null)) {
    const monthly = monthlyForPay != null ? Number(monthlyForPay) : null;
    const deal = dealForPay != null ? Number(dealForPay) : null;
    const mult = saleMultiplierToStore != null ? Number(saleMultiplierToStore) : null;
    if (monthly != null && monthly > 0 && deal != null && deal > 0) {
      saleMultiplierToStore = Math.round((deal / monthly) * 10) / 10;
    } else if (monthly != null && monthly > 0 && mult != null && mult > 0) {
      dealForPay = Math.round(monthly * mult);
    }
  }
  const payAmount =
    listingType === "subcontract" && input.monthly_amount != null
      ? Number(input.monthly_amount)
      : isSaleRegular && (monthlyForPay != null || dealForPay != null)
        ? Number(monthlyForPay ?? dealForPay ?? input.pay_amount)
        : listingType === "sale_one_time" && input.deal_amount != null
          ? Number(input.deal_amount)
          : isReferral &&
              input.expected_amount != null &&
              input.fee_rate_percent != null &&
              input.fee_rate_percent >= 0 &&
              input.fee_rate_percent <= 100
            ? Math.round(Number(input.expected_amount) * Number(input.fee_rate_percent) / 100)
            : input.pay_amount;

  const { error } = await supabase.from("listings").insert({
    user_id: user.id,
    listing_type: input.listing_type,
    status: "open",
    title: input.title.trim(),
    work_date: input.work_date?.trim() || null,
    body: input.body?.trim() || null,
    region: input.region.trim(),
    category_main_id: resolved.category_main_id,
    category_sub_id: resolved.category_sub_id,
    custom_subcategory_text: resolved.custom_subcategory_text,
    skill_level: input.skill_level?.trim() || null,
    pay_amount: payAmount,
    pay_unit: input.pay_unit,
    contact_phone: input.contact_phone.trim(),
    monthly_amount: monthlyForPay ?? input.monthly_amount ?? null,
    deal_amount: dealForPay ?? input.deal_amount ?? null,
    sale_multiplier: isSaleRegular ? saleMultiplierToStore : null,
    expected_amount: input.expected_amount ?? null,
    fee_rate_percent: input.fee_rate_percent ?? null,
    area_pyeong: input.area_pyeong ?? null,
    visits_per_week: input.visits_per_week ?? null,
    difficulty: input.difficulty ?? null,
    estimate_check_required: input.estimate_check_required ?? false,
    stairs_floors: input.stairs_floors ?? null,
    stairs_restroom_count: input.stairs_restroom_count ?? null,
    stairs_has_recycle: input.stairs_has_recycle ?? false,
    stairs_has_corridor: input.stairs_has_corridor ?? false,
    stairs_elevator: input.stairs_elevator ?? false,
    stairs_parking: input.stairs_parking ?? false,
    stairs_window: input.stairs_window ?? false,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/listings");
  return { ok: true };
}

export type ListingBenchmarkRow = {
  metric_type: string;
  sample_count: number;
  median_value: number | null;
  avg_value: number | null;
  min_value: number | null;
  max_value: number | null;
  /** 표본 적을 때 넓은 조건으로 조회한 결과일 수 있음 */
  fallback_level?: "exact" | "main_category" | "region_only";
};

/** 글쓰기 폼용: 지역·유형·카테고리 기준 참고값. 표본 적으면 대분류·지역만 등 다단계 폴백 */
export async function getListingBenchmarks(
  region: string,
  listing_type: string,
  category_group: "regular" | "one_time",
  category_preset_key: string
): Promise<ListingBenchmarkRow[]> {
  const supabase = await createServerSupabase();
  const regionTrim = region.trim();
  const { data: firstMain } = await supabase
    .from("categories")
    .select("id")
    .is("parent_id", null)
    .eq("is_active", true)
    .limit(1)
    .single();
  const fallbackMainId = firstMain?.id ?? "";
  const resolved = await resolveListingCategory(
    supabase,
    category_group,
    category_preset_key,
    null,
    fallbackMainId
  );

  const mapRows = (
    data: { metric_type: string; sample_count: number | null; median_value: unknown; avg_value: unknown; min_value: unknown; max_value: unknown }[] | null,
    level: ListingBenchmarkRow["fallback_level"]
  ): ListingBenchmarkRow[] =>
    (data ?? []).map((r) => ({
      metric_type: r.metric_type,
      sample_count: r.sample_count ?? 0,
      median_value: r.median_value != null ? Number(r.median_value) : null,
      avg_value: r.avg_value != null ? Number(r.avg_value) : null,
      min_value: r.min_value != null ? Number(r.min_value) : null,
      max_value: r.max_value != null ? Number(r.max_value) : null,
      fallback_level: level,
    }));

  let q = supabase
    .from("listing_benchmarks")
    .select("metric_type, sample_count, median_value, avg_value, min_value, max_value")
    .eq("region", regionTrim)
    .eq("listing_type", listing_type)
    .eq("category_main_id", resolved.category_main_id);
  if (resolved.category_sub_id) {
    q = q.eq("category_sub_id", resolved.category_sub_id);
  } else {
    q = q.is("category_sub_id", null);
  }
  const { data: exactData } = await q;
  const exactRows = mapRows(exactData, "exact");
  if (exactRows.length > 0) return exactRows;

  const { data: mainData } = await supabase
    .from("listing_benchmarks")
    .select("metric_type, sample_count, median_value, avg_value, min_value, max_value")
    .eq("region", regionTrim)
    .eq("listing_type", listing_type)
    .eq("category_main_id", resolved.category_main_id)
    .is("category_sub_id", null);
  const mainRows = mapRows(mainData, "main_category");
  if (mainRows.length > 0) return mainRows;

  const { data: regionData } = await supabase
    .from("listing_benchmarks")
    .select("metric_type, sample_count, median_value, avg_value, min_value, max_value")
    .eq("region", regionTrim)
    .eq("listing_type", listing_type);
  return mapRows(regionData, "region_only");
}
