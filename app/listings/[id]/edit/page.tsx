import { notFound } from "next/navigation";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { parseSidoFromRegion, parseGugunFromRegion, REGION_SIDO_LIST, REGION_GUGUN } from "@/lib/listings/regions";
import type { ListingCategoryGroupId } from "@/lib/listings/listing-category-presets";
import NewListingForm, { type EditInitialData } from "../../new/NewListingForm";

export const revalidate = 0;

type TransactionType = "referral" | "sale" | "subcontract";

function listingTypeToTransactionAndGroup(
  listingType: string
): { transactionType: TransactionType; categoryGroup: ListingCategoryGroupId } {
  switch (listingType) {
    case "sale_regular":
      return { transactionType: "sale", categoryGroup: "regular" };
    case "sale_one_time":
      return { transactionType: "sale", categoryGroup: "one_time" };
    case "referral_regular":
      return { transactionType: "referral", categoryGroup: "regular" };
    case "referral_one_time":
      return { transactionType: "referral", categoryGroup: "one_time" };
    case "subcontract":
      return { transactionType: "subcontract", categoryGroup: "regular" };
    default:
      return { transactionType: "referral", categoryGroup: "regular" };
  }
}

function buildEditInitialData(
  listing: Record<string, unknown>,
  categories: { id: string; name: string | null; slug: string | null; parent_id: string | null }[]
): EditInitialData {
  const { transactionType, categoryGroup } = listingTypeToTransactionAndGroup(
    (listing.listing_type as string) ?? "referral_regular"
  );
  const region = (listing.region as string) ?? "";
  const sido = parseSidoFromRegion(region);
  const gugunRaw = parseGugunFromRegion(region);
  const regionSido = REGION_SIDO_LIST.includes(sido as (typeof REGION_SIDO_LIST)[number])
    ? (sido as (typeof REGION_SIDO_LIST)[number])
    : "서울";
  const gugunList = REGION_GUGUN[regionSido] ?? [];
  const regionGugun = gugunRaw && gugunList.includes(gugunRaw) ? gugunRaw : (gugunList[0] ?? "");

  let mainId = (listing.category_main_id as string) ?? "";
  let subId = (listing.category_sub_id as string | null) ?? null;
  let customSub = (listing.custom_subcategory_text as string | null) ?? null;
  let categoryCustomText = customSub?.trim() ?? "";

  const norm = (s: string) => s.replace(/\s+/g, "").trim();
  if (categoryCustomText && categories.length > 0) {
    const customNorm = norm(categoryCustomText);
    const matched =
      categories.find((c) => c.name && norm(c.name) === customNorm) ??
      categories.find((c) => c.name && c.name.trim() === categoryCustomText);
    if (matched) {
      if (matched.parent_id == null) {
        mainId = matched.id;
        subId = null;
        categoryCustomText = "";
      } else {
        mainId = matched.parent_id;
        subId = matched.id;
        categoryCustomText = "";
      }
    }
  }

  const payAmount = listing.pay_amount != null ? String(Number(listing.pay_amount)) : "";
  const rawPayUnit = (listing.pay_unit as string) ?? "day";
  const payUnit = rawPayUnit === "monthly" ? "day" : rawPayUnit;
  const monthlyAmount =
    listing.monthly_amount != null ? String(Number(listing.monthly_amount)) : "";
  const dealAmount = listing.deal_amount != null ? String(Number(listing.deal_amount)) : "";
  const saleMultiplier =
    listing.sale_multiplier != null ? String(Number(listing.sale_multiplier)) : "";
  const expectedAmount =
    listing.expected_amount != null ? String(Number(listing.expected_amount)) : "";
  const feeRatePercent =
    listing.fee_rate_percent != null ? String(Number(listing.fee_rate_percent)) : "";
  const areaPyeong = listing.area_pyeong != null ? String(Number(listing.area_pyeong)) : "";
  const areaUnknown = listing.area_pyeong == null || Number(listing.area_pyeong) <= 0;
  const visitsPerWeek =
    listing.visits_per_week != null ? String(Number(listing.visits_per_week)) : "";
  const difficulty = (listing.difficulty as "easy" | "normal" | "hard") ?? "";
  const estimateCheckRequired = Boolean(listing.estimate_check_required);
  const stairsFloors =
    listing.stairs_floors != null ? String(Number(listing.stairs_floors)) : "";
  const stairsRestroomCount = Number(listing.stairs_restroom_count) || 0;
  const stairsHasRecycle = Boolean(listing.stairs_has_recycle);
  const stairsHasCorridor = Boolean(listing.stairs_has_corridor);
  const stairsElevator = Boolean(listing.stairs_elevator);
  const stairsParking = Boolean(listing.stairs_parking);
  const stairsWindow = Boolean(listing.stairs_window);

  const expectedNum = expectedAmount ? parseFloat(expectedAmount) : null;
  const feeNum = feeRatePercent ? parseFloat(feeRatePercent) : null;
  const amountUndecided =
    estimateCheckRequired || expectedNum == null || expectedNum <= 0 || feeNum == null;

  return {
    transactionType,
    title: (listing.title as string) ?? "",
    workDate: listing.work_date ? String(listing.work_date).slice(0, 10) : "",
    body: (listing.body as string) ?? "",
    regionSido,
    regionGugun,
    categoryGroup,
    categoryMainId: mainId,
    categorySubId: subId,
    categoryCustomText,
    payAmount,
    payUnit,
    monthlyAmount,
    dealAmount,
    saleMultiplier,
    expectedAmount,
    amountUndecided,
    feeRatePercent,
    areaPyeong,
    areaUnknown,
    areaUnit: "pyeong",
    visitsPerWeek,
    difficulty: difficulty === "easy" || difficulty === "normal" || difficulty === "hard" ? difficulty : "",
    estimateCheckRequired,
    stairsFloors,
    stairsRestroomCount,
    stairsHasRecycle,
    stairsHasCorridor,
    stairsElevator,
    stairsParking,
    stairsWindow,
    contactPhone: (listing.contact_phone as string) ?? "",
  };
}

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) notFound();

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (listingError || !listing) notFound();

  const isExternal = (listing as { is_external?: boolean }).is_external;
  if (isExternal) {
    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = (profile as { role?: string } | null)?.role;
    const isAdmin = role === "admin" || role === "editor";
    if (!isAdmin) notFound();
  } else {
    if (listing.user_id !== user.id) notFound();
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id, slug, usage")
    .eq("is_active", true)
    .in("usage", ["listing", "default"]);

  const list = categories ?? [];
  const listingOnly = list.filter((c) => (c as { usage?: string }).usage === "listing");
  const forForm = listingOnly.length > 0 ? listingOnly : list;
  const mainCategories = forForm.filter((c) => c.parent_id == null).map((c) => ({ id: c.id, name: (c.name ?? "").trim() || "(이름 없음)" }));
  const subCategories = forForm.filter((c) => c.parent_id != null).map((c) => ({ id: c.id, name: (c.name ?? "").trim() || "(이름 없음)", parent_id: c.parent_id!, slug: c.slug ?? undefined }));
  if (mainCategories.length === 0) notFound();

  const { data: cltRows } = await supabase.from("category_listing_types").select("category_id, listing_type");
  const categoryListingTypes: Record<string, string[]> = {};
  for (const row of cltRows ?? []) {
    const catId = row.category_id as string;
    if (!categoryListingTypes[catId]) categoryListingTypes[catId] = [];
    categoryListingTypes[catId].push(row.listing_type as string);
  }

  const initialData = buildEditInitialData(listing, forForm);

  return (
    <NewListingForm
      mainCategories={mainCategories}
      subCategories={subCategories}
      categoryListingTypes={categoryListingTypes}
      initialData={initialData}
      listingId={id}
    />
  );
}
