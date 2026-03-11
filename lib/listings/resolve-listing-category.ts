import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LISTING_CATEGORY_OTHER,
  getGroupById,
  getOptionByKey,
  type ListingCategoryGroupId,
} from "./listing-category-presets";

export type ResolvedListingCategory = {
  category_main_id: string;
  category_sub_id: string | null;
  custom_subcategory_text: string | null;
};

/**
 * 그룹(정기/일회성) + 프리셋 키 + 기타 입력으로 category_main_id, category_sub_id, custom_subcategory_text 결정.
 */
export async function resolveListingCategory(
  supabase: SupabaseClient,
  groupId: ListingCategoryGroupId | null | undefined,
  presetKey: string | null | undefined,
  customText: string | null | undefined,
  fallbackMainCategoryId: string
): Promise<ResolvedListingCategory> {
  const text = (customText ?? "").trim() || null;
  const group = groupId ? getGroupById(groupId) : null;
  const mainId = group
    ? (await supabase.from("categories").select("id").eq("slug", group.mainSlug).is("parent_id", null).eq("is_active", true).limit(1).single()).data?.id ?? fallbackMainCategoryId
    : fallbackMainCategoryId;

  if (!presetKey || presetKey === LISTING_CATEGORY_OTHER) {
    return {
      category_main_id: mainId,
      category_sub_id: null,
      custom_subcategory_text: text,
    };
  }

  const option = group ? getOptionByKey(groupId!, presetKey) : null;
  if (!option || option.key === LISTING_CATEGORY_OTHER) {
    return {
      category_main_id: mainId,
      category_sub_id: null,
      custom_subcategory_text: text,
    };
  }

  if (option.subSlug) {
    const { data: subCat } = await supabase
      .from("categories")
      .select("id, parent_id")
      .eq("slug", option.subSlug)
      .eq("parent_id", mainId)
      .eq("is_active", true)
      .limit(1)
      .single();
    if (subCat?.id) {
      return {
        category_main_id: mainId,
        category_sub_id: subCat.id,
        custom_subcategory_text: null,
      };
    }
  }

  return {
    category_main_id: mainId,
    category_sub_id: null,
    custom_subcategory_text: option.label,
  };
}
