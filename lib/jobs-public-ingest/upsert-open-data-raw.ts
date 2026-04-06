import type { SupabaseClient } from "@supabase/supabase-js";

export type JobOpenDataRawRow = {
  source_slug: string;
  source_record_id: string;
  payload: Record<string, unknown>;
  last_fetched_at: string;
};

/**
 * `job_open_data_raw` 배치 upsert. first_seen_at 은 신규 행에만 DB 기본값 적용.
 * 충돌 시 payload·last_fetched_at 만 갱신(PostgREST upsert 동작).
 */
export async function upsertJobOpenDataRawBatch(
  supabase: SupabaseClient,
  rows: JobOpenDataRawRow[]
): Promise<{ error: string | null }> {
  if (rows.length === 0) return { error: null };
  const chunkSize = 150;
  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => ({
      ...r,
      last_fetched_at: r.last_fetched_at || now,
    }));
    const { error } = await supabase.from("job_open_data_raw").upsert(chunk, {
      onConflict: "source_slug,source_record_id",
    });
    if (error) return { error: error.message };
  }
  return { error: null };
}
