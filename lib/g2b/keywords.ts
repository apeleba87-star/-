/**
 * DB tender_keywords에서 업종별 include/exclude 키워드 로드
 */

import { createClient } from "@/lib/supabase-server";

export type TenderCategoryCode = "cleaning" | "disinfection";

export interface TenderKeywordOptions {
  includeKeywords: string[];
  excludeKeywords: string[];
}

/** 카테고리별 옵션 + 공통 제외. 하위 호환용 단일 반환 */
export async function getTenderKeywordOptions(): Promise<TenderKeywordOptions> {
  const by = await getTenderKeywordOptionsByCategory();
  const cleaning = by.cleaning ?? { includeKeywords: [], excludeKeywords: [] };
  return {
    includeKeywords: cleaning.includeKeywords,
    excludeKeywords: by.globalExclude,
  };
}

export interface CategoryKeywordOptions {
  cleaning: TenderKeywordOptions;
  disinfection: TenderKeywordOptions;
  globalExclude: string[];
}

/** 업종별 include + 공통 exclude */
export async function getTenderKeywordOptionsByCategory(): Promise<CategoryKeywordOptions> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tender_keywords")
      .select("keyword, keyword_type, category")
      .eq("enabled", true);

    if (error)
      return {
        cleaning: { includeKeywords: [], excludeKeywords: [] },
        disinfection: { includeKeywords: [], excludeKeywords: [] },
        globalExclude: [],
      };

    const globalExclude: string[] = [];
    const byCategory: Record<string, { include: string[]; exclude: string[] }> = {
      cleaning: { include: [], exclude: [] },
      disinfection: { include: [], exclude: [] },
    };

    for (const row of data ?? []) {
      const kw = (row.keyword as string)?.trim();
      if (!kw) continue;
      const type = row.keyword_type as string | null;
      const cat = row.category as string | null;

      if (type === "exclude") {
        if (cat) {
          if (byCategory[cat]) byCategory[cat].exclude.push(kw);
        } else {
          globalExclude.push(kw);
        }
        continue;
      }

      if (cat && byCategory[cat]) byCategory[cat].include.push(kw);
    }

    return {
      cleaning: {
        includeKeywords: byCategory.cleaning.include,
        excludeKeywords: [...globalExclude, ...byCategory.cleaning.exclude],
      },
      disinfection: {
        includeKeywords: byCategory.disinfection.include,
        excludeKeywords: [...globalExclude, ...byCategory.disinfection.exclude],
      },
      globalExclude,
    };
  } catch {
    return {
      cleaning: { includeKeywords: [], excludeKeywords: [] },
      disinfection: { includeKeywords: [], excludeKeywords: [] },
      globalExclude: [],
    };
  }
}
