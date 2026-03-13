"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function addIndustry(
  code: string,
  name: string,
  group_key: string | null,
  sort_order: number
) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("industries")
    .insert({
      code: code.trim(),
      name: name.trim(),
      group_key: group_key?.trim() || null,
      sort_order: Number(sort_order) || 0,
      is_active: true,
    })
    .select("id, code, name, group_key, sort_order, is_active")
    .single();

  if (error) return { ok: false, error: error.message, row: null };
  revalidatePath("/admin/industries");
  revalidatePath("/tenders");
  return { ok: true, row: data };
}

export async function updateIndustry(
  id: string,
  updates: { name?: string; group_key?: string | null; sort_order?: number; is_active?: boolean }
) {
  const supabase = await createServerSupabase();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.group_key !== undefined) payload.group_key = updates.group_key?.trim() || null;
  if (updates.sort_order !== undefined) payload.sort_order = Number(updates.sort_order) || 0;
  if (updates.is_active !== undefined) payload.is_active = updates.is_active;

  const { error } = await supabase.from("industries").update(payload).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/industries");
  revalidatePath("/tenders");
  return { ok: true };
}

export async function deleteIndustry(id: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("industries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/industries");
  revalidatePath("/tenders");
  return { ok: true };
}
