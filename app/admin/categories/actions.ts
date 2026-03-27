"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type CategoryUsage = "default" | "listing" | "job";
export type JobTypePresetRow = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  category_main_id: string | null;
  category_sub_id: string | null;
};

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

export type JobCategoryRefRow = {
  id: string;
  name: string;
  usage: CategoryUsage;
  refCount: number;
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

export async function getJobTypePresets(): Promise<{
  data: JobTypePresetRow[];
  error: string | null;
}> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("job_type_presets")
    .select("id, key, label, sort_order, is_active, category_main_id, category_sub_id")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((r) => ({
      id: r.id as string,
      key: r.key as string,
      label: r.label as string,
      sort_order: Number(r.sort_order) || 0,
      is_active: Boolean(r.is_active),
      category_main_id: (r.category_main_id as string | null) ?? null,
      category_sub_id: (r.category_sub_id as string | null) ?? null,
    })),
    error: null,
  };
}

export async function addJobTypePreset(input: {
  key?: string;
  label: string;
  sort_order: number;
  category_main_id?: string | null;
  category_sub_id?: string | null;
}) {
  const supabase = await createServerSupabase();
  const label = input.label.trim();
  if (!label) return { ok: false, error: "라벨을 입력해 주세요.", row: null };
  const key = (input.key ?? "").trim() || (await generateUniqueJobTypePresetKey(supabase, label));
  const { data, error } = await supabase
    .from("job_type_presets")
    .insert({
      key,
      label,
      sort_order: input.sort_order,
      is_active: true,
      category_main_id: input.category_main_id ?? null,
      category_sub_id: input.category_sub_id ?? null,
    })
    .select("id, key, label, sort_order, is_active, category_main_id, category_sub_id")
    .single();
  if (error) return { ok: false, error: error.message, row: null };
  revalidatePath("/admin/categories");
  revalidatePath("/jobs/new");
  revalidatePath("/jobs/[id]/edit");
  return {
    ok: true,
    error: null,
    row: {
      id: data.id as string,
      key: data.key as string,
      label: data.label as string,
      sort_order: Number(data.sort_order) || 0,
      is_active: Boolean(data.is_active),
      category_main_id: (data.category_main_id as string | null) ?? null,
      category_sub_id: (data.category_sub_id as string | null) ?? null,
    } as JobTypePresetRow,
  };
}

async function generateUniqueJobTypePresetKey(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  label: string
): Promise<string> {
  const asciiBase = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const base = asciiBase || "preset";
  for (let i = 0; i < 100; i += 1) {
    const candidate = i === 0 ? base : `${base}_${i + 1}`;
    const { data } = await supabase
      .from("job_type_presets")
      .select("id")
      .eq("key", candidate)
      .maybeSingle();
    if (!data?.id) return candidate;
  }
  return `preset_${Date.now()}`;
}

export async function updateJobTypePreset(
  id: string,
  updates: {
    key?: string;
    label?: string;
    sort_order?: number;
    is_active?: boolean;
    category_main_id?: string | null;
    category_sub_id?: string | null;
  }
) {
  const supabase = await createServerSupabase();
  const body: Record<string, unknown> = {};
  if (updates.key !== undefined) body.key = updates.key.trim();
  if (updates.label !== undefined) body.label = updates.label.trim();
  if (updates.sort_order !== undefined) body.sort_order = updates.sort_order;
  if (updates.is_active !== undefined) body.is_active = updates.is_active;
  if (updates.category_main_id !== undefined) body.category_main_id = updates.category_main_id;
  if (updates.category_sub_id !== undefined) body.category_sub_id = updates.category_sub_id;
  const { error } = await supabase.from("job_type_presets").update(body).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/categories");
  revalidatePath("/jobs/new");
  revalidatePath("/jobs/[id]/edit");
  return { ok: true, error: null };
}

export async function deleteJobTypePreset(id: string): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("job_type_presets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/categories");
  revalidatePath("/jobs/new");
  revalidatePath("/jobs/[id]/edit");
  return { ok: true, error: null };
}

/**
 * 현재 인력구인 포지션에서 실제 참조 중인 카테고리 목록(대/소분류 합산).
 * - 관리자 화면에서 "왜 안 보이는지" 점검 및 usage 전환용.
 */
export async function getJobCategoryReferences(): Promise<{
  data: JobCategoryRefRow[];
  error: string | null;
}> {
  const supabase = await createServerSupabase();
  const { data: positionRows, error: posErr } = await supabase
    .from("job_post_positions")
    .select("category_main_id, category_sub_id");
  if (posErr) return { data: [], error: posErr.message };

  const countMap = new Map<string, number>();
  for (const row of positionRows ?? []) {
    const mainId = (row as { category_main_id?: string | null }).category_main_id;
    const subId = (row as { category_sub_id?: string | null }).category_sub_id;
    if (mainId) countMap.set(mainId, (countMap.get(mainId) ?? 0) + 1);
    if (subId) countMap.set(subId, (countMap.get(subId) ?? 0) + 1);
  }
  const ids = [...countMap.keys()];
  if (ids.length === 0) return { data: [], error: null };

  const { data: cats, error: catErr } = await supabase
    .from("categories")
    .select("id, name, usage")
    .in("id", ids);
  if (catErr) return { data: [], error: catErr.message };

  const rows: JobCategoryRefRow[] = (cats ?? [])
    .map((c) => ({
      id: c.id as string,
      name: c.name as string,
      usage: (c.usage ?? "default") as CategoryUsage,
      refCount: countMap.get(c.id as string) ?? 0,
    }))
    .sort((a, b) => b.refCount - a.refCount || a.name.localeCompare(b.name));
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
  updates: { name?: string; sort_order?: number; is_active?: boolean; usage?: CategoryUsage }
) {
  const supabase = await createServerSupabase();
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) body.name = updates.name.trim();
  if (updates.sort_order !== undefined) body.sort_order = updates.sort_order;
  if (updates.is_active !== undefined) body.is_active = updates.is_active;
  if (updates.usage !== undefined) body.usage = updates.usage;
  const { error } = await supabase.from("categories").update(body).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/categories");
  revalidatePath("/jobs/new");
  revalidatePath("/jobs/[id]/edit");
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
