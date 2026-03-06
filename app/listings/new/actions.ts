"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

type CreateListingInput = {
  listing_type: string;
  title: string;
  work_date?: string | null;
  body?: string | null;
  region: string;
  category_main_id: string;
  category_sub_id?: string | null;
  custom_subcategory_text?: string | null;
  skill_level?: string | null;
  pay_amount: number;
  pay_unit: string;
  contact_phone: string;
};

export async function createListing(input: CreateListingInput) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!input.category_main_id?.trim()) {
    return { ok: false, error: "대분류를 선택하세요." };
  }

  const { error } = await supabase.from("listings").insert({
    user_id: user.id,
    listing_type: input.listing_type,
    status: "open",
    title: input.title.trim(),
    work_date: input.work_date?.trim() || null,
    body: input.body?.trim() || null,
    region: input.region.trim(),
    category_main_id: input.category_main_id.trim(),
    category_sub_id: input.category_sub_id?.trim() || null,
    custom_subcategory_text: input.custom_subcategory_text?.trim() || null,
    skill_level: input.skill_level?.trim() || null,
    pay_amount: input.pay_amount,
    pay_unit: input.pay_unit,
    contact_phone: input.contact_phone.trim(),
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/listings");
  return { ok: true };
}
