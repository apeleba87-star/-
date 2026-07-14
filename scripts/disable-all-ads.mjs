/**
 * 모든 공개 광고 비활성: home_ad_slots / radar / magam
 * 사용: node --env-file=.env.local scripts/disable-all-ads.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}

const sb = createClient(url, key);

const home = await sb.from("home_ad_slots").update({ enabled: false }).eq("enabled", true).select("key");
const banners = await sb.from("radar_ad_banners").update({ enabled: false }).eq("enabled", true).select("id");
const radar = await sb
  .from("radar_ad_slots")
  .update({ status: "paused", updated_at: new Date().toISOString() })
  .eq("status", "active")
  .select("id");
const magam = await sb
  .from("magam_radar_ad_settings")
  .update({ national_enabled: false, regional_enabled: false })
  .not("id", "is", null)
  .select("id");

// 재확인
const checkSlots = await sb.from("home_ad_slots").select("key, enabled").eq("enabled", true);
const checkMagam = await sb.from("magam_radar_ad_settings").select("national_enabled, regional_enabled");
const checkRadar = await sb.from("radar_ad_slots").select("id").eq("status", "active");

console.log(
  JSON.stringify(
    {
      home_disabled_keys: (home.data || []).map((r) => r.key),
      home_error: home.error?.message || null,
      radar_banners_disabled: (banners.data || []).length,
      banners_error: banners.error?.message || null,
      radar_slots_paused: (radar.data || []).length,
      radar_error: radar.error?.message || null,
      magam_updated: (magam.data || []).length,
      magam_error: magam.error?.message || null,
      still_enabled_home_slots: (checkSlots.data || []).map((r) => r.key),
      still_active_radar_slots: (checkRadar.data || []).length,
      magam_now: checkMagam.data || null,
    },
    null,
    2
  )
);
