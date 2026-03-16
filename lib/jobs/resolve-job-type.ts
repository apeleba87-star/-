import type { SupabaseClient } from "@supabase/supabase-js";
import { JOB_TYPE_PRESETS, JOB_TYPE_OTHER } from "./job-type-presets";

export type ResolvedJobType = {
  category_main_id: string;
  category_sub_id: string | null;
  job_type_input: string;
  normalized_job_type_key: string | null;
  normalization_status: "auto_mapped" | "manual_review" | "manual_mapped";
};

/**
 * 프리셋 키 또는 기타 입력으로 category_main_id, category_sub_id, 정규화 필드 결정.
 * categories는 slug로 조회 가능해야 함.
 */
export async function resolveJobType(
  supabase: SupabaseClient,
  jobTypeKey: string | null | undefined,
  jobTypeInput: string | null | undefined,
  fallbackMainCategoryId: string
): Promise<ResolvedJobType> {
  const inputText = (jobTypeInput ?? "").trim() || "기타";
  if (!jobTypeKey || jobTypeKey === JOB_TYPE_OTHER) {
    return {
      category_main_id: fallbackMainCategoryId,
      category_sub_id: null,
      job_type_input: inputText,
      normalized_job_type_key: null,
      normalization_status: "manual_review",
    };
  }
  const preset = JOB_TYPE_PRESETS.find((x) => x.key === jobTypeKey);
  if (!preset) {
    return {
      category_main_id: fallbackMainCategoryId,
      category_sub_id: null,
      job_type_input: inputText,
      normalized_job_type_key: null,
      normalization_status: "manual_review",
    };
  }
  const { data: subCat } = await supabase
    .from("categories")
    .select("id, parent_id")
    .eq("slug", preset.subSlug)
    .eq("is_active", true)
    .in("usage", ["job", "default"])
    .limit(1)
    .single();
  if (!subCat?.parent_id) {
    return {
      category_main_id: fallbackMainCategoryId,
      category_sub_id: null,
      job_type_input: preset.label,
      normalized_job_type_key: preset.key,
      normalization_status: "manual_review",
    };
  }
  return {
    category_main_id: subCat.parent_id,
    category_sub_id: subCat.id,
    job_type_input: preset.label,
    normalized_job_type_key: preset.key,
    normalization_status: "auto_mapped",
  };
}
