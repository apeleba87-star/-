"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  isValidSido,
  isValidGugunForSido,
  normalizeIndustryCodes,
} from "@/lib/tenders/user-focus";

export async function saveUserTenderFocus(input: {
  regionSido: string | null;
  regionGugun: string | null;
  industryCodes: string[];
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };

  let region_sido: string | null = null;
  let region_gugun: string | null = null;
  if (isValidSido(input.regionSido)) {
    region_sido = input.regionSido;
    const g = (input.regionGugun ?? "").trim();
    region_gugun = g && isValidGugunForSido(input.regionSido!, g) ? g : null;
  }

  const industry_codes = normalizeIndustryCodes(input.industryCodes ?? []);

  const { data: industryRows } = await supabase
    .from("industries")
    .select("code")
    .eq("is_active", true);
  const allowed = new Set((industryRows ?? []).map((r) => r.code));
  const filtered = industry_codes.filter((c) => allowed.has(c));

  const { error } = await supabase.from("user_tender_focus").upsert(
    {
      user_id: user.id,
      region_sido,
      region_gugun,
      industry_codes: filtered,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/tenders");
  return { ok: true as const };
}

export async function clearUserTenderFocus() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };

  const { error } = await supabase.from("user_tender_focus").delete().eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/tenders");
  return { ok: true as const };
}
