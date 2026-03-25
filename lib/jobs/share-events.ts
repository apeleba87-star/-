import type { SupabaseClient } from "@supabase/supabase-js";

export type JobShareEventType = "share_click" | "share_open" | "share_apply";

export async function insertJobShareEvent(params: {
  supabase: SupabaseClient;
  jobPostId: string;
  ownerUserId: string;
  actorUserId: string | null;
  eventType: JobShareEventType;
  channel?: string;
  ref?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  const { supabase, jobPostId, ownerUserId, actorUserId, eventType, channel, ref, userAgent, meta } = params;
  const { error } = await supabase.from("job_share_events").insert({
    job_post_id: jobPostId,
    owner_user_id: ownerUserId,
    actor_user_id: actorUserId,
    event_type: eventType,
    channel: (channel ?? "unknown").slice(0, 40),
    ref: ref ? ref.slice(0, 120) : null,
    user_agent: userAgent ? userAgent.slice(0, 500) : null,
    meta: meta ?? null,
  });
  if (error) {
    console.warn("[job-share-event] insert failed:", error.message);
  }
}

