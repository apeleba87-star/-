"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function updateWorkerProfileForApply(input: {
  nickname: string;
  birth_year: number | null;
  gender: string | null;
  bio: string | null;
  contact_phone: string | null;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const birthYear = input.birth_year != null ? Number(input.birth_year) : null;
  const gender = input.gender === "M" || input.gender === "F" || input.gender === "other" ? input.gender : null;

  if (birthYear == null || birthYear < 1900 || birthYear > 2100) {
    return { ok: false, error: "나이(출생년도)를 올바르게 입력해 주세요. (1900~2100)" };
  }
  if (!gender || gender === "") {
    return { ok: false, error: "성별을 선택해 주세요." };
  }

  const { data: existing } = await supabase
    .from("worker_profiles")
    .select("nickname")
    .eq("user_id", user.id)
    .maybeSingle();

  const existingNick = existing?.nickname;
  const inputNick = (input.nickname ?? "").trim();
  const keptNickname = (existingNick != null && existingNick !== "") ? existingNick : (inputNick !== "" ? inputNick : null);
  const { error } = await supabase
    .from("worker_profiles")
    .upsert(
      {
        user_id: user.id,
        nickname: keptNickname,
        birth_year: birthYear,
        gender,
        bio: (input.bio ?? "").trim() || null,
        contact_phone: (input.contact_phone ?? "").trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/mypage");
  revalidatePath("/jobs");
  return { ok: true };
}
