"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type OnboardingChoice = "work" | "operate" | "promote";

export async function submitOnboarding(choices: OnboardingChoice[]) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const wantWork = choices.includes("work");
  const wantOperate = choices.includes("operate");
  const wantPromote = choices.includes("promote");

  if (!wantWork && !wantOperate && !wantPromote) {
    return { ok: false, error: "최소 하나의 활동을 선택해 주세요." };
  }

  if (wantWork) {
    const { data: existing } = await supabase
      .from("worker_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      const { data: profile } = await supabase.from("profiles").select("display_name, phone").eq("id", user.id).single();
      await supabase.from("worker_profiles").insert({
        user_id: user.id,
        nickname: profile?.display_name ?? "",
        contact_phone: profile?.phone ?? null,
      });
    }
  }

  if (wantOperate || wantPromote) {
    const { data: existing } = await supabase
      .from("company_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      await supabase.from("company_profiles").insert({
        user_id: user.id,
        company_name: profile?.display_name ?? "",
      });
    }
  }

  await supabase.from("member_capabilities").upsert(
    {
      user_id: user.id,
      can_apply_jobs: wantWork,
      can_post_jobs: wantOperate,
      can_post_contracts: false,
      can_post_promotions: wantPromote,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  await supabase.from("profiles").update({ onboarding_done: true, updated_at: new Date().toISOString() }).eq("id", user.id);

  revalidatePath("/");
  revalidatePath("/onboarding");
  return { ok: true };
}
