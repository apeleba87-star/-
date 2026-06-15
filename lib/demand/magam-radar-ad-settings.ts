import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";

export type MagamRadarAdSettings = {
  nationalEnabled: boolean;
  regionalEnabled: boolean;
};

type Row = {
  national_enabled: boolean;
  regional_enabled: boolean;
};

const DEFAULTS: MagamRadarAdSettings = {
  nationalEnabled: false,
  regionalEnabled: false,
};

function mapRow(row: Row | null): MagamRadarAdSettings {
  if (!row) return DEFAULTS;
  return {
    nationalEnabled: row.national_enabled,
    regionalEnabled: row.regional_enabled,
  };
}

export async function getMagamRadarAdSettings(
  supabase?: SupabaseClient
): Promise<MagamRadarAdSettings> {
  const client = supabase ?? (await createClient());
  const { data } = await client
    .from("magam_radar_ad_settings")
    .select("national_enabled, regional_enabled")
    .eq("id", 1)
    .maybeSingle();

  return mapRow((data as Row | null) ?? null);
}
