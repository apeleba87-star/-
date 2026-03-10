"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

type Input = {
  job_post_id: string;
  full_address?: string | null;
  contact_phone?: string | null;
  access_instructions?: string | null;
  parking_info?: string | null;
  notes?: string | null;
};

export async function saveJobPostPrivateDetails(input: Input) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: post } = await supabase.from("job_posts").select("user_id").eq("id", input.job_post_id).single();
  if (!post || post.user_id !== user.id) return { ok: false, error: "권한이 없습니다." };

  const { error } = await supabase.from("job_post_private_details").upsert(
    {
      job_post_id: input.job_post_id,
      full_address: input.full_address?.trim() || null,
      contact_phone: input.contact_phone?.trim() || null,
      access_instructions: input.access_instructions?.trim() || null,
      parking_info: input.parking_info?.trim() || null,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "job_post_id" }
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/jobs/${input.job_post_id}`);
  return { ok: true };
}
