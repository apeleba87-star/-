/**
 * 앱 전역 설정 (app_settings) 읽기/쓰기
 * - tender_keywords_enabled: 입찰 수집·백필 시 키워드 기반 categories 적용 여부
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const KEY_TENDER_KEYWORDS = "tender_keywords_enabled";

export async function getTenderKeywordsEnabled(
  supabase: SupabaseClient
): Promise<boolean> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", KEY_TENDER_KEYWORDS)
    .single();
  if (error || data?.value == null) return false;
  return data.value === true || data.value === "true";
}

export async function setTenderKeywordsEnabled(
  supabase: SupabaseClient,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key: KEY_TENDER_KEYWORDS, value: enabled, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
