"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/** YYYY-MM-DD 형식인지 및 유효 날짜 범위(1900~2100년) 검사 */
function isValidBirthDate(value: string | null): boolean {
  if (!value || typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export async function updateWorkerProfileForApply(input: {
  nickname: string;
  birth_date: string | null;
  gender: string | null;
  bio: string | null;
  contact_phone: string | null;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const birthDate = (input.birth_date ?? "").trim() || null;
  const gender = input.gender === "M" || input.gender === "F" ? input.gender : null;

  if (!birthDate || !isValidBirthDate(birthDate)) {
    return { ok: false, error: "생일을 올바르게 입력해 주세요. (예: 1990-01-01)" };
  }
  if (!gender) {
    return { ok: false, error: "성별을 선택해 주세요. (남/여)" };
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
        birth_date: birthDate,
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
