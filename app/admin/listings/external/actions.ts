"use server";

import type { ListingBulkParsedRow } from "@/lib/admin/listing-bulk-excel";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateExternalListingInput = {
  title: string;
  body?: string | null;
  region: string;
  listing_type: string;
  category_main_id: string;
  category_sub_id?: string | null;
  /** 월 수금(정기 매매/도급) 또는 성사 금액(소개). 현장거래는 일당 없음. */
  monthly_amount?: number | null;
  deal_amount?: number | null;
  sale_multiplier?: number | null;
  area_pyeong?: number | null;
  visits_per_week?: number | null;
  contact_phone: string;
  source_url?: string | null;
};

async function executeExternalListingInsert(
  supabase: SupabaseClient,
  userId: string,
  input: CreateExternalListingInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const monthly = input.monthly_amount != null ? Number(input.monthly_amount) : null;
  const deal = input.deal_amount != null ? Number(input.deal_amount) : null;
  const mult = input.sale_multiplier != null ? Number(input.sale_multiplier) : null;
  const areaPyeong = input.area_pyeong != null ? Number(input.area_pyeong) : null;
  const visits = input.visits_per_week != null ? Number(input.visits_per_week) : null;

  const isSale = input.listing_type === "sale_regular";
  const isSub = input.listing_type === "subcontract";
  const isReferral = input.listing_type === "referral_regular" || input.listing_type === "referral_one_time";
  const payAmount = isSub ? (monthly ?? 0) : isReferral ? (deal ?? 0) : (monthly ?? deal ?? 0);
  if (payAmount <= 0) return { ok: false, error: "월 수금, 매매가 또는 성사 금액을 입력하세요." };

  const monthlyAmountDb = isSale || isSub ? (monthly ?? payAmount) : null;
  const saleMultRaw =
    isSale && (mult != null || (monthly != null && deal != null && monthly > 0))
      ? mult ?? (monthly != null && deal != null ? deal / monthly : null)
      : null;
  const saleMultDb =
    saleMultRaw != null && saleMultRaw > 0 && saleMultRaw <= 100 ? saleMultRaw : null;
  const dealAmountDb = isSale || isReferral ? (deal ?? (isReferral ? payAmount : null)) : null;
  const dealAmountFinal =
    isSale && dealAmountDb == null && monthlyAmountDb != null && monthlyAmountDb > 0 && saleMultDb != null
      ? Math.round(monthlyAmountDb * saleMultDb)
      : dealAmountDb;

  const { error } = await supabase.from("listings").insert({
    user_id: userId,
    listing_type: input.listing_type,
    status: "open",
    title: input.title.trim(),
    body: input.body?.trim() || null,
    region: input.region.trim(),
    category_main_id: input.category_main_id,
    category_sub_id: input.category_sub_id || null,
    pay_amount: payAmount,
    pay_unit: "monthly",
    normalized_daily_wage: null,
    normalized_hourly_wage: null,
    monthly_amount: monthlyAmountDb,
    deal_amount: dealAmountFinal,
    sale_multiplier: saleMultDb,
    area_pyeong: areaPyeong ?? null,
    visits_per_week: visits != null && visits >= 1 && visits <= 7 ? visits : null,
    contact_phone: input.contact_phone.trim(),
    is_external: true,
    source_url: input.source_url?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createExternalListing(input: CreateExternalListingInput) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") return { ok: false, error: "권한이 없습니다." };

  if (!input.title?.trim()) return { ok: false, error: "제목을 입력하세요." };
  if (!input.region?.trim()) return { ok: false, error: "지역을 입력하세요." };
  if (!input.category_main_id) return { ok: false, error: "카테고리를 선택하세요." };
  if (!input.contact_phone?.trim()) return { ok: false, error: "연락처를 입력하세요." };

  const result = await executeExternalListingInsert(supabase, user.id, input);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/listings");
  revalidatePath("/admin/listings/external");
  return { ok: true };
}

export type BulkCreateListingExcelFailure = { rowIndex: number; message: string };

export async function bulkCreateExternalListingsFromExcel(rows: ListingBulkParsedRow[]): Promise<
  | { ok: true; inserted: number; failures: BulkCreateListingExcelFailure[] }
  | { ok: false; error: string }
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") return { ok: false, error: "권한이 없습니다." };

  const failures: BulkCreateListingExcelFailure[] = [];
  let inserted = 0;

  for (const row of rows) {
    const result = await executeExternalListingInsert(supabase, user.id, {
      title: row.title,
      body: row.body,
      region: row.region,
      listing_type: row.listing_type,
      category_main_id: row.category_main_id,
      category_sub_id: row.category_sub_id,
      monthly_amount: row.monthly_amount,
      deal_amount: row.deal_amount,
      sale_multiplier: row.sale_multiplier,
      area_pyeong: row.area_pyeong,
      visits_per_week: row.visits_per_week,
      contact_phone: row.contact_phone,
      source_url: row.source_url,
    });
    if (result.ok) inserted++;
    else failures.push({ rowIndex: row.rowIndex, message: result.error });
  }

  if (inserted > 0) {
    revalidatePath("/listings");
    revalidatePath("/admin/listings/external");
  }

  return { ok: true, inserted, failures };
}

const LISTING_TYPE_BY_LABEL: Record<string, string> = {
  "정기 매매": "sale_regular",
  "정기 소개": "referral_regular",
  "일회성 소개": "referral_one_time",
  도급: "subcontract",
};

export type BulkRowInput = {
  title: string;
  body?: string | null;
  region: string;
  listing_type: string;
  category_name: string;
  /** 월 수금(정기 매매/도급) 또는 성사 금액(소개). 현장거래는 일당 없음. */
  monthly_amount?: number | null;
  deal_amount?: number | null;
  sale_multiplier?: number | null;
  area_pyeong?: number | null;
  visits_per_week?: number | null;
  contact_phone: string;
  source_url?: string | null;
};

export type BulkResult = {
  ok: true;
  inserted: number;
  failed: { row: number; message: string }[];
};

export async function createExternalListingsBulk(
  rows: BulkRowInput[],
  categories: { id: string; name: string }[]
): Promise<BulkResult | { ok: false; error: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") return { ok: false, error: "권한이 없습니다." };

  const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]));
  for (const c of categories) {
    if (!categoryByName.has(c.name.trim().toLowerCase())) {
      categoryByName.set(c.name.trim().toLowerCase(), c.id);
    }
  }

  let inserted = 0;
  const failed: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 1;

    const title = (r.title ?? "").trim();
    if (!title) {
      failed.push({ row: rowNum, message: "제목 없음" });
      continue;
    }
    const region = (r.region ?? "").trim();
    if (!region) {
      failed.push({ row: rowNum, message: "지역 없음" });
      continue;
    }
    const listingType =
      LISTING_TYPE_BY_LABEL[r.listing_type?.trim() ?? ""] ?? (r.listing_type?.trim() || "referral_one_time");
    if (!["sale_regular", "referral_regular", "referral_one_time", "subcontract"].includes(listingType)) {
      failed.push({ row: rowNum, message: `유형 불명: ${r.listing_type}` });
      continue;
    }
    const categoryMainId = categoryByName.get((r.category_name ?? "").trim().toLowerCase());
    if (!categoryMainId) {
      failed.push({ row: rowNum, message: `카테고리 없음: ${r.category_name}` });
      continue;
    }
    const monthly = r.monthly_amount != null && Number.isFinite(Number(r.monthly_amount)) ? Number(r.monthly_amount) : null;
    const deal = r.deal_amount != null && Number.isFinite(Number(r.deal_amount)) ? Number(r.deal_amount) : null;
    const mult = r.sale_multiplier != null && Number.isFinite(Number(r.sale_multiplier)) ? Number(r.sale_multiplier) : null;
    const areaPyeong = r.area_pyeong != null && Number.isFinite(Number(r.area_pyeong)) ? Number(r.area_pyeong) : null;
    const visits = r.visits_per_week != null ? Number(r.visits_per_week) : null;
    const contactPhone = (r.contact_phone ?? "").trim();
    if (!contactPhone) {
      failed.push({ row: rowNum, message: "연락처 없음" });
      continue;
    }

    const result = await executeExternalListingInsert(supabase, user.id, {
      title,
      body: (r.body ?? "").trim() || null,
      region,
      listing_type: listingType,
      category_main_id: categoryMainId,
      category_sub_id: null,
      monthly_amount: monthly,
      deal_amount: deal,
      sale_multiplier: mult,
      area_pyeong: areaPyeong,
      visits_per_week: visits,
      contact_phone: contactPhone,
      source_url: (r.source_url ?? "").trim() || null,
    });

    if (!result.ok) {
      failed.push({ row: rowNum, message: result.error });
    } else {
      inserted++;
    }
  }

  revalidatePath("/listings");
  revalidatePath("/admin/listings/external");
  return { ok: true, inserted, failed };
}
