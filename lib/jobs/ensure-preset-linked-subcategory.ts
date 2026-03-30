import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 엑셀 `category_sub_id`·집계는 categories 소분류 UUID를 씁니다.
 * 프리셋만 있고 매핑이 없을 때 첫 번째 인력구인 대분류 아래 소분류를 만들고 id를 돌려줍니다.
 */
export async function createJobSubcategoryForPresetLabel(
  supabase: SupabaseClient,
  label: string
): Promise<{ category_sub_id: string; category_main_id: string } | { error: string }> {
  const name = label.trim();
  if (!name) return { error: "업종 라벨이 비어 있습니다." };

  const { data: mains, error: mErr } = await supabase
    .from("categories")
    .select("id, usage")
    .eq("is_active", true)
    .in("usage", ["job", "default"])
    .is("parent_id", null)
    .order("sort_order", { ascending: true })
    .limit(1);

  if (mErr) return { error: mErr.message };
  const mainRow = mains?.[0];
  if (!mainRow?.id) {
    return {
      error:
        "연결할 인력구인 대분류가 없습니다. 관리자 → 카테고리에서 대분류를 먼저 추가한 뒤 다시 시도하세요.",
    };
  }

  const mainId = mainRow.id as string;
  const usage = (mainRow.usage ?? "job") as string;

  const { data: maxSortRow } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("parent_id", mainId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = Math.max(0, Number(maxSortRow?.sort_order ?? -1) + 1);
  const slug = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const { data: inserted, error: insErr } = await supabase
    .from("categories")
    .insert({
      name,
      parent_id: mainId,
      slug,
      sort_order: nextSort,
      is_active: true,
      usage: usage === "listing" ? "job" : usage,
    })
    .select("id")
    .single();

  if (insErr || !inserted?.id) {
    return { error: insErr?.message ?? "소분류를 만들 수 없습니다." };
  }

  return { category_sub_id: inserted.id as string, category_main_id: mainId };
}

/** 기존 프리셋 행에 category_sub_id가 비어 있으면 소분류를 만든 뒤 연결합니다. */
export async function syncJobTypePresetWithSubcategory(
  supabase: SupabaseClient,
  presetId: string,
  label: string
): Promise<{ category_sub_id: string; category_main_id: string } | { error: string }> {
  const { data: row, error: rErr } = await supabase
    .from("job_type_presets")
    .select("category_sub_id, category_main_id")
    .eq("id", presetId)
    .maybeSingle();
  if (rErr) return { error: rErr.message };

  const sid = String(row?.category_sub_id ?? "").trim();
  if (sid) {
    let mid = String(row?.category_main_id ?? "").trim();
    if (!mid) {
      const { data: sub } = await supabase.from("categories").select("parent_id").eq("id", sid).maybeSingle();
      mid = String(sub?.parent_id ?? "").trim();
      if (mid) {
        await supabase
          .from("job_type_presets")
          .update({ category_main_id: mid, updated_at: new Date().toISOString() })
          .eq("id", presetId);
      }
    }
    if (mid) return { category_sub_id: sid, category_main_id: mid };
  }

  const created = await createJobSubcategoryForPresetLabel(supabase, label);
  if ("error" in created) return created;

  const { error: uErr } = await supabase
    .from("job_type_presets")
    .update({
      category_sub_id: created.category_sub_id,
      category_main_id: created.category_main_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", presetId);

  if (uErr) return { error: uErr.message };
  return {
    category_sub_id: created.category_sub_id,
    category_main_id: created.category_main_id,
  };
}
