import type { SupabaseClient } from "@supabase/supabase-js";

export const APP_SETTING_WORKNET_CLEANING_KEYWORDS = "worknet_cleaning_keywords";

/** 기본 청소·용역 매칭 키워드 (소문자 비교) */
export const DEFAULT_WORKNET_CLEANING_KEYWORDS = [
  "청소",
  "미화",
  "환경미화",
  "건물청소",
  "위생",
  "방역",
  "소독",
  "청소원",
  "미화원",
  "준공청소",
  "입주청소",
] as const;

/** 청소와 무관한 시설·소방·경비 등 (시설관리 단독 매칭 방지) */
const CLEANING_EXCLUDE_RE =
  /소방시설|소방관리|소방설비|전기.?시설|승강기|경비원|주차관리|시설관리사|건축물관리사|전기공|통신설비|냉.?난방.?설비|가스.?시설|소방공무원/i;

function normalizeKeywordList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const k = item.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/** app_settings JSON 배열 → 없으면 기본값 */
export async function getWorknetCleaningKeywords(
  supabase?: SupabaseClient
): Promise<string[]> {
  if (supabase) {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", APP_SETTING_WORKNET_CLEANING_KEYWORDS)
      .maybeSingle();
    const fromDb = normalizeKeywordList(data?.value);
    if (fromDb.length > 0) return fromDb;
  }
  const envRaw = process.env.WORKNET_CLEANING_KEYWORDS?.trim();
  if (envRaw) {
    try {
      const parsed = JSON.parse(envRaw) as unknown;
      const fromEnv = normalizeKeywordList(parsed);
      if (fromEnv.length > 0) return fromEnv;
    } catch {
      const split = envRaw.split(/[,|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (split.length > 0) return [...new Set(split)];
    }
  }
  return [...DEFAULT_WORKNET_CLEANING_KEYWORDS];
}

/** 수집 API keyword 파라미터용 (첫 키워드 + 로테이션은 ingest에서) */
export function cleaningKeywordsForIngest(keywords: string[]): string[] {
  return keywords.length > 0 ? keywords : [...DEFAULT_WORKNET_CLEANING_KEYWORDS];
}

export function textMatchesCleaningKeywords(text: string, keywords: string[]): boolean {
  const blob = text.toLowerCase();
  if (!blob.trim()) return false;
  if (CLEANING_EXCLUDE_RE.test(blob)) return false;
  return keywords.some((k) => blob.includes(k.toLowerCase()));
}
