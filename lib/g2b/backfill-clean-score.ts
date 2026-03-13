/**
 * 기존 tenders 행에 대해 업종별 categories·is_clean_related 백필
 * DB tender_keywords(업종별 include/exclude) 사용. app_settings에서 키워드 사용 시에만 동작.
 */

import { createClient } from "@/lib/supabase-server";
import { computeCategoryScores } from "./clean-score";
import { getTenderKeywordOptionsByCategory } from "./keywords";
import { getTenderKeywordsEnabled } from "@/lib/app-settings";

const BATCH = 100;

export async function runBackfillCleanScore(): Promise<{
  ok: boolean;
  updated: number;
  error?: string;
}> {
  const supabase = createClient();
  const keywordsEnabled = await getTenderKeywordsEnabled(supabase);
  if (!keywordsEnabled) return { ok: true, updated: 0 };
  const optionsByCategory = await getTenderKeywordOptionsByCategory();

  let updated = 0;
  let offset = 0;

  try {
    for (;;) {
      const { data: rows, error: fetchError } = await supabase
        .from("tenders")
        .select("id, bid_ntce_nm, raw")
        .order("id", { ascending: true })
        .range(offset, offset + BATCH - 1);

      if (fetchError) throw fetchError;
      if (!rows?.length) break;

      for (const row of rows) {
        const title = String(row.bid_ntce_nm ?? "");
        const raw = (row.raw as Record<string, unknown>) ?? {};
        const detailParts = [
          raw.bidNtceDtl,
          raw.prcureObjDtl,
          raw.ntceSpecDocCn,
        ].filter(Boolean) as string[];
        const detailText = detailParts.length ? detailParts.join(" ") : undefined;

        const categories = computeCategoryScores(title, detailText, optionsByCategory);

        const { error: updateError } = await supabase
          .from("tenders")
          .update({
            categories,
            is_clean_related: categories.includes("cleaning"),
            clean_score: categories.length ? 50 : 0,
            clean_reason: { categories },
          })
          .eq("id", row.id);

        if (updateError) throw updateError;
        updated++;
      }

      if (rows.length < BATCH) break;
      offset += BATCH;
    }

    return { ok: true, updated };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, updated, error: message };
  }
}
