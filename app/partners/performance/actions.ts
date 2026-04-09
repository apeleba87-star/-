"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";

type PriceInput = {
  item_name: string;
  unit?: string | null;
  base_price: number;
  note?: string | null;
};

export type SubmitPartnerChangeRequestInput = {
  company_id: string;
  main_image_url?: string | null;
  prices: PriceInput[];
};

export async function submitPartnerChangeRequest(input: SubmitPartnerChangeRequestInput) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const companyId = input.company_id?.trim();
  if (!companyId) return { ok: false, error: "업체 정보가 필요합니다." };

  const { data: company } = await supabase
    .from("partner_companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!company) return { ok: false, error: "권한이 없습니다." };

  const prices = input.prices
    .map((p) => ({
      item_name: p.item_name?.trim() ?? "",
      unit: p.unit?.trim() || null,
      base_price: Number(p.base_price),
      note: p.note?.trim() || null,
    }))
    .filter((p) => p.item_name && Number.isFinite(p.base_price) && p.base_price >= 0);

  if (prices.length === 0) return { ok: false, error: "최소 1개 이상의 단가 항목이 필요합니다." };

  const { error } = await supabase.from("partner_company_change_requests").insert({
    company_id: companyId,
    requester_user_id: user.id,
    request_type: "profile_update",
    status: "pending",
    payload: {
      main_image_url: input.main_image_url?.trim() || null,
      prices,
    },
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/partners/performance");
  revalidatePath("/admin/partners");
  return { ok: true };
}
