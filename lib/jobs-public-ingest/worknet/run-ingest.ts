import type { SupabaseClient } from "@supabase/supabase-js";
import { JOB_OPEN_DATA_SOURCE_WORKNET_WANTED } from "@/lib/jobs-public-ingest/source-slugs";
import { upsertJobOpenDataRawBatch } from "@/lib/jobs-public-ingest/upsert-open-data-raw";
import {
  cleaningKeywordsForIngest,
  getWorknetCleaningKeywords,
} from "./cleaning-keywords";
import { fetchWorknetListPage } from "./fetch-list";
import { WORKNET_MAX_DISPLAY } from "./constants";

const MAX_PAGES_GUARD = 50;

export async function runWorknetWantedIngest(opts: {
  supabase: SupabaseClient;
  apiKey: string;
  maxRowsPerKeyword?: number;
  regDate?: string;
  regionCode?: string;
}): Promise<{
  ok: boolean;
  keywords: string[];
  pages: number;
  rowsWritten: number;
  error?: string;
}> {
  const keywords = cleaningKeywordsForIngest(await getWorknetCleaningKeywords(opts.supabase));
  const maxPerKeyword = Math.max(10, Math.floor(opts.maxRowsPerKeyword ?? 500));
  let pages = 0;
  let rowsWritten = 0;

  for (const keyword of keywords) {
    let startPage = 1;
    let writtenForKeyword = 0;

    while (writtenForKeyword < maxPerKeyword && pages < MAX_PAGES_GUARD) {
      const parsed = await fetchWorknetListPage({
        authKey: opts.apiKey,
        startPage,
        display: WORKNET_MAX_DISPLAY,
        keyword,
        region: opts.regionCode,
        regDate: opts.regDate ?? "W-2",
      });
      pages += 1;

      if (parsed.items.length === 0) break;

      const batch = parsed.items
        .filter((item) => item.wantedAuthNo?.trim())
        .map((item) => ({
          source_slug: JOB_OPEN_DATA_SOURCE_WORKNET_WANTED,
          source_record_id: item.wantedAuthNo.trim(),
          payload: item as unknown as Record<string, unknown>,
          last_fetched_at: new Date().toISOString(),
        }));

      const { error } = await upsertJobOpenDataRawBatch(opts.supabase, batch);
      if (error) {
        return { ok: false, keywords, pages, rowsWritten, error };
      }

      rowsWritten += batch.length;
      writtenForKeyword += batch.length;

      if (parsed.items.length < WORKNET_MAX_DISPLAY) break;
      if (startPage >= 1000) break;
      startPage += 1;
    }
  }

  return { ok: true, keywords, pages, rowsWritten };
}
