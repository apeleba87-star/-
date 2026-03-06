"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/** 포지션 충원 수 증가 (1명 충원 완료) */
export async function incrementPositionFilled(positionId: string, jobPostId: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: post } = await supabase.from("job_posts").select("user_id").eq("id", jobPostId).single();
  if (!post || post.user_id !== user.id) return { ok: false, error: "권한이 없습니다." };

  const { data: pos } = await supabase
    .from("job_post_positions")
    .select("filled_count, required_count")
    .eq("id", positionId)
    .eq("job_post_id", jobPostId)
    .single();

  if (!pos) return { ok: false, error: "포지션을 찾을 수 없습니다." };
  const nextFilled = Math.min(pos.filled_count + 1, pos.required_count);

  const { error: updateError } = await supabase
    .from("job_post_positions")
    .update({ filled_count: nextFilled, updated_at: new Date().toISOString() })
    .eq("id", positionId);

  if (updateError) return { ok: false, error: updateError.message };

  const { data: allPositions } = await supabase
    .from("job_post_positions")
    .select("status")
    .eq("job_post_id", jobPostId);
  const allClosed = (allPositions ?? []).every((p) => p.status === "closed");
  if (allClosed) {
    await supabase.from("job_posts").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", jobPostId);
  }

  revalidatePath(`/jobs/${jobPostId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

/** 게시글 전체 마감 */
export async function closeJobPost(jobPostId: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: post } = await supabase.from("job_posts").select("user_id").eq("id", jobPostId).single();
  if (!post || post.user_id !== user.id) return { ok: false, error: "권한이 없습니다." };

  const { error } = await supabase
    .from("job_posts")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", jobPostId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/jobs/${jobPostId}`);
  revalidatePath("/jobs");
  return { ok: true };
}
