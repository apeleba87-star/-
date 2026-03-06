"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function getCategories(): Promise<{ data: CategoryRow[]; error: string | null }> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null };
}

export async function addMainCategory(name: string, sortOrder: number) {
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
    })
    .select("id, name, parent_id, slug, sort_order, is_active, created_at, updated_at")
    .single();
  if (error) return { ok: false, error: error.message, row: null };
  revalidatePath("/admin/categories");
  revalidatePath("/listings/new");
  return { ok: true, error: null, row: data as CategoryRow };
}

export async function addSubCategory(
  parentId: string,
  name: string,
  sortOrder: number
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
    })
    .select("id, name, parent_id, slug, sort_order, is_active, created_at, updated_at")
    .single();
  if (error) return { ok: false, error: error.message, row: null };
  revalidatePath("/admin/categories");
  revalidatePath("/listings/new");
  return { ok: true, error: null, row: data as CategoryRow };
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
  return { ok: true, error: null };
}
