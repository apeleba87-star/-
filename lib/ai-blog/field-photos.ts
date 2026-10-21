import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const FIELD_PHOTO_BUCKET = "ai-blog-photos";

type Row = { id: string; storage_path: string | null; original_expires_at?: string | null };

function pathsOf(rows: Row[]): string[] {
  return rows.map((row) => row.storage_path).filter((path): path is string => Boolean(path));
}

export async function purgeExpiredOriginals(supabase: SupabaseClient, projectId: string) {
  const db = supabase.schema("cleanidex");
  const { data } = await db
    .from("project_media")
    .select("id, storage_path, original_expires_at")
    .eq("project_id", projectId);
  const now = Date.now();
  const expired = ((data ?? []) as Row[]).filter((row) => {
    if (!row.storage_path || !row.original_expires_at) return false;
    return Date.parse(row.original_expires_at) <= now;
  });
  const paths = pathsOf(expired);
  if (!paths.length) return;
  await supabase.storage.from(FIELD_PHOTO_BUCKET).remove(paths);
  await db
    .from("project_media")
    .update({ storage_path: null })
    .in(
      "id",
      expired.map((row) => row.id),
    );
}

export async function purgeProjectOriginals(supabase: SupabaseClient, projectId: string) {
  const db = supabase.schema("cleanidex");
  const { data } = await db.from("project_media").select("id, storage_path").eq("project_id", projectId);
  const rows = (data ?? []) as Row[];
  const paths = pathsOf(rows);
  if (paths.length) await supabase.storage.from(FIELD_PHOTO_BUCKET).remove(paths);
  await db.from("project_media").update({ storage_path: null }).eq("project_id", projectId).not("storage_path", "is", null);
}
