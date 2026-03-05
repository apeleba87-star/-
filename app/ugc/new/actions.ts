"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type SubmitUgcPayload = {
  type: "field" | "review" | "issue";
  region?: string | null;
  area_sqm?: number | null;
  frequency?: string | null;
  price_per_pyeong?: number | null;
  scope?: string | null;
  rating?: number | null;
  comment?: string | null;
  issue_text?: string | null;
};

export async function submitUgc(payload: SubmitUgcPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const row = {
    type: payload.type,
    user_id: user?.id ?? null,
    region: payload.region || null,
    area_sqm: payload.area_sqm ?? null,
    frequency: payload.frequency || null,
    price_per_pyeong: payload.price_per_pyeong ?? null,
    scope: payload.scope || null,
    rating: payload.rating ?? null,
    comment: payload.comment || null,
    issue_text: payload.issue_text || null,
    status: "pending",
  };

  const { error } = await supabase.from("ugc").insert(row);
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/ugc");
  revalidatePath("/");
  return { ok: true };
}
