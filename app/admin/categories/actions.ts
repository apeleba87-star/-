"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type CategoryUsage = "default" | "listing" | "job";

type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  slug: string;
  sort_order: number;
  is_active: boolean;
  usage: CategoryUsage;
  created_at: string;
  updated_at: string;
};

export async function getCategories(): Promise<{ data: CategoryRow[]; error: string | null }> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_id, slug, sort_order, is_active, usage, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return { data: [], error: error.message };
  const rows = (data ?? []).map((r) => ({
    ...r,
    usage: (r.usage ?? "default") as CategoryUsage,
  }));
  return { data: rows, error: null };
}

export async function addMainCategory(
  name: string,
  sortOrder: number,
  usage: CategoryUsage
) {
  const supabase = await createServerSupabase();
  const slug = `main-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: name.trim(),
      parent_id: null,
      slug,
      sort_order: sortOrder,
      is_active: true,
      usage,
    })
    .select("id, name, parent_id, slug, sort_order, is_active, usage, created_at, updated_at")
    .single();
  if (error) return { ok: false, error: error.message, row: null };
  revalidatePath("/admin/categories");
  revalidatePath("/listings/new");
  revalidatePath("/listings");
  return { ok: true, error: null, row: { ...data, usage: (data.usage ?? "default") as CategoryUsage } as CategoryRow };
}

export async function addSubCategory(
  parentId: string,
  name: string,
  sortOrder: number,
  usage: CategoryUsage
) {
  const supabase = await createServerSupabase();
  const slug = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: name.trim(),
      parent_id: parentId,
      slug,
      sort_order: sortOrder,
      is_active: true,
      usage,
    })
    .select("id, name, parent_id, slug, sort_order, is_active, usage, created_at, updated_at")
    .single();
  if (error) return { ok: false, error: error.message, row: null };
  revalidatePath("/admin/categories");
  revalidatePath("/listings/new");
  revalidatePath("/listings");
  return { ok: true, error: null, row: { ...data, usage: (data.usage ?? "default") as CategoryUsage } as CategoryRow };
}

export async function updateCategory(
  id: string,
  updates: { name?: string; sort_order?: number; is_active?: boolean }
) {
  const supabase = await createServerSupabase();
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) body.name = updates.name.trim();
  if (updates.sort_order !== undefined) body.sort_order = updates.sort_order;
  if (updates.is_active !== undefined) body.is_active = updates.is_active;
  const { error } = await supabase.from("categories").update(body).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/categories");
  revalidatePath("/listings/new");
  revalidatePath("/listings");
  return { ok: true, error: null };
}

/** 카테고리 삭제. 인력구인 등 다른 테이블에서 참조 중이면 실패. 현장거래 글은 참조만 NULL로 바뀜. */
export async function deleteCategory(id: string): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createServerSupabase();
  const { data: jobRef } = await supabase
    .from("job_post_positions")
    .select("id")
    .or(`category_main_id.eq.${id},category_sub_id.eq.${id}`)
    .limit(1)
    .maybeSingle();
  if (jobRef) {
    return { ok: false, error: "이 카테고리를 사용하는 인력구인 글이 있어 삭제할 수 없습니다. 비활성화를 이용하세요." };
  }
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/listings/new");
  revalidatePath("/listings");
  return { ok: true, error: null };
}

const LISTING_TYPES = [
  "sale_regular",
  "sale_one_time",
  "referral_regular",
  "referral_one_time",
  "subcontract",
] as const;

export type ListingTypeKey = (typeof LISTING_TYPES)[number];

/** 현장거래 카테고리별 적용 거래 유형. category_id -> listing_type[]. 빈 배열 = 모든 유형에 노출 */
export async function getCategoryListingTypesMap(): Promise<{
  data: Record<string, string[]>;
  error: string | null;
}> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("category_listing_types")
    .select("category_id, listing_type");
  if (error) return { data: {}, error: error.message };
  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    const id = row.category_id as string;
    if (!map[id]) map[id] = [];
    map[id].push(row.listing_type as string);
  }
  return { data: map, error: null };
}

export async function setCategoryListingTypes(
  categoryId: string,
  listingTypes: string[]
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createServerSupabase();
  const valid = listingTypes.filter((t) =>
    LISTING_TYPES.includes(t as ListingTypeKey)
  );
  await supabase.from("category_listing_types").delete().eq("category_id", categoryId);
  if (valid.length > 0) {
    const { error } = await supabase.from("category_listing_types").insert(
      valid.map((listing_type) => ({ category_id: categoryId, listing_type }))
    );
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/listings/new");
  revalidatePath("/listings");
  return { ok: true, error: null };
}
