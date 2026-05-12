"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  isBetaReviewStatus,
  parseReviewTagsInput,
  type BetaReviewStatus,
} from "@/lib/beta-admin-review";

async function ensureAdminSupabase() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = profile?.role === "admin" || profile?.role === "editor";
  if (!isStaff) return { ok: false as const, error: "관리자만 처리할 수 있습니다." };
  return { ok: true as const, supabase };
}

export async function updateBetaApplicationReview(input: {
  id: string;
  reviewStatus: BetaReviewStatus;
  reviewTagsRaw: string;
  adminNote: string;
}) {
  const auth = await ensureAdminSupabase();
  if (!auth.ok) return auth;

  const id = typeof input.id === "string" ? input.id.trim() : "";
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false as const, error: "잘못된 ID입니다." };
  }
  if (!isBetaReviewStatus(input.reviewStatus)) {
    return { ok: false as const, error: "잘못된 상태입니다." };
  }

  const review_tags = parseReviewTagsInput(input.reviewTagsRaw ?? "");
  const admin_note = (input.adminNote ?? "").trim().slice(0, 8000);

  const { error } = await auth.supabase
    .from("beta_applications")
    .update({
      review_status: input.reviewStatus,
      review_tags,
      admin_note,
    })
    .eq("id", id);

  if (error) {
    console.error("[updateBetaApplicationReview]", error);
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/admin/beta-applications");
  return { ok: true as const };
}
