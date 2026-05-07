import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_MS = 60_000;
const CHECK_IN_MAX = 5;
const CHECK_OUT_MAX = 10;

export async function assertAttendanceRateLimit(
  supabase: SupabaseClient,
  userId: string,
  kind: "check_in" | "check_out"
): Promise<{ ok: true } | { ok: false; error: string; retry_after_sec: number }> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const max = kind === "check_in" ? CHECK_IN_MAX : CHECK_OUT_MAX;
  const { count, error } = await supabase
    .schema("cleanidex")
    .from("attendance_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("occurred_at", since);
  if (error) {
    return { ok: false, error: error.message, retry_after_sec: 60 };
  }
  if ((count ?? 0) >= max) {
    return {
      ok: false,
      error: "rate_limit_exceeded",
      retry_after_sec: Math.ceil(WINDOW_MS / 1000),
    };
  }
  return { ok: true };
}
