import { cache } from "react";

import { createClient } from "@/lib/supabase-server";
import type { MagamListingPublic } from "@/lib/magam/types";

const PUBLIC_SELECT =
  "id, listing_type, region_gu, body_text, contact_phone, poster_name, price_text, schedule_text, special_notes, status, share_slug, created_at, updated_at, closed_at, schedule_date, time_slot, city_id, district_slug, work_kind, pyeong, ac_types, price_amount, price_unit, price_negotiable, trade_side, trade_client_count, trade_total_revenue, trade_regions_in_detail, hiring_employment_type, subcontract_kind, regular_frequency_count, regular_frequency_negotiable, regular_area_in_detail";

const LIVE_LISTING_TYPES = ["subcontract", "hiring", "trade"] as const;

export const getMagamListingBySlug = cache(async (slug: string): Promise<MagamListingPublic | null> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("magam_listings_public")
    .select(PUBLIC_SELECT)
    .eq("share_slug", slug)
    .maybeSingle();
  return (data as MagamListingPublic | null) ?? null;
});

export async function getMagamOpenListings(options?: {
  regionGu?: string;
  listingType?: string;
  excludeSlug?: string;
  limit?: number;
}): Promise<MagamListingPublic[]> {
  const supabase = createClient();
  const limit = options?.limit ?? 20;
  let query = supabase
    .from("magam_listings_public")
    .select(PUBLIC_SELECT)
    .eq("status", "open")
    .in("listing_type", LIVE_LISTING_TYPES)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.regionGu) {
    query = query.eq("region_gu", options.regionGu);
  }
  if (options?.listingType) {
    query = query.eq("listing_type", options.listingType);
  }
  if (options?.excludeSlug) {
    query = query.neq("share_slug", options.excludeSlug);
  }

  const { data } = await query;
  return (data as MagamListingPublic[] | null) ?? [];
}
