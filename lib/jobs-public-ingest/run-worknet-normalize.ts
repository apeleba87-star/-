import type { SupabaseClient } from "@supabase/supabase-js";
import { JOB_OPEN_DATA_SOURCE_WORKNET_WANTED } from "@/lib/jobs-public-ingest/source-slugs";
import { getWorknetCleaningKeywords } from "@/lib/jobs-public-ingest/worknet/cleaning-keywords";
import { normalizeWorknetListItem } from "@/lib/jobs-public-ingest/worknet/normalize-row";
import type { WorknetListItem } from "@/lib/jobs-public-ingest/worknet/types";

const BATCH = 200;

export async function runWorknetNormalizeFromRaw(opts: {
  supabase: SupabaseClient;
  maxRows?: number;
}): Promise<{ ok: boolean; processed: number; upserted: number; error?: string }> {
  const keywords = await getWorknetCleaningKeywords(opts.supabase);
  const limit = Math.max(1, Math.floor(opts.maxRows ?? 3000));
  let processed = 0;
  let upserted = 0;
  let offset = 0;

  while (processed < limit) {
    const { data, error } = await opts.supabase
      .from("job_open_data_raw")
      .select("source_record_id, payload, last_fetched_at")
      .eq("source_slug", JOB_OPEN_DATA_SOURCE_WORKNET_WANTED)
      .order("last_fetched_at", { ascending: false })
      .range(offset, offset + BATCH - 1);

    if (error) return { ok: false, processed, upserted, error: error.message };
    if (!data?.length) break;

    const rows = [];
    const now = new Date();
    for (const r of data) {
      processed += 1;
      const payload = r.payload as WorknetListItem | null;
      if (!payload?.wantedAuthNo) continue;
      const norm = normalizeWorknetListItem(payload, keywords, now);
      if (norm) rows.push(norm);
    }

    if (rows.length > 0) {
      const { error: upErr } = await opts.supabase
        .from("public_job_openings")
        .upsert(rows, { onConflict: "source_slug,source_record_id" });
      if (upErr) return { ok: false, processed, upserted, error: upErr.message };
      upserted += rows.length;
    }

    if (data.length < BATCH) break;
    offset += BATCH;
  }

  const staleCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  await opts.supabase
    .from("public_job_openings")
    .update({ is_open: false })
    .eq("source_slug", JOB_OPEN_DATA_SOURCE_WORKNET_WANTED)
    .lt("last_synced_at", staleCutoff);

  return { ok: true, processed, upserted };
}
