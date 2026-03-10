"use server";

import { createClient } from "@/lib/supabase-server";

/** 이메일 중복 여부 조회 (가입 전 전체 조회, 대소문자 무시). RPC는 SECURITY DEFINER로 DB에서 실행됩니다. */
export async function checkEmailAvailable(email: string) {
  const trimmed = email?.trim();
  if (!trimmed) return { ok: true, available: false, error: "이메일을 입력하세요." };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("check_email_available", { email_input: trimmed });
  if (error) return { ok: false, available: false, error: error.message };
  return { ok: true, available: data === true };
}

/** 별명 중복 여부 조회 (가입 전 전체 조회, 대소문자·공백 무시). RPC는 SECURITY DEFINER로 DB에서 실행됩니다. */
export async function checkNicknameAvailable(nickname: string) {
  const trimmed = nickname?.trim();
  if (!trimmed) return { ok: true, available: false, error: "별명을 입력하세요." };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("check_display_name_available", { name_input: trimmed });
  if (error) return { ok: false, available: false, error: error.message };
  return { ok: true, available: data === true };
}
