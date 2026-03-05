"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { EstimateConfig } from "@/lib/estimate-config";

const CONFIG_ID = "a0000000-0000-0000-0000-000000000001";

export async function saveEstimateConfig(config: Partial<EstimateConfig>) {
  const supabase = await createServerSupabase();
  const { data: existing } = await supabase.from("estimate_config").select("config").eq("id", CONFIG_ID).single();
  const current = (existing?.config as Record<string, unknown>) ?? {};
  const merged = { ...current, ...config };

  const { error } = await supabase
    .from("estimate_config")
    .upsert({ id: CONFIG_ID, config: merged, updated_at: new Date().toISOString() }, { onConflict: "id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/estimate-config");
  revalidatePath("/estimate");
  return { ok: true };
}
