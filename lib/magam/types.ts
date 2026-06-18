export const MAGAM_LISTING_TYPES = ["subcontract", "hiring", "trade"] as const;
export type MagamListingType = (typeof MAGAM_LISTING_TYPES)[number];

export const MAGAM_LISTING_STATUSES = ["open", "closed"] as const;
export type MagamListingStatus = (typeof MAGAM_LISTING_STATUSES)[number];

export type MagamListingPublic = {
  id: string;
  listing_type: MagamListingType;
  region_gu: string;
  body_text: string;
  contact_phone: string | null;
  poster_name?: string | null;
  price_text: string | null;
  schedule_text: string | null;
  special_notes: string | null;
  status: MagamListingStatus;
  share_slug: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  schedule_date?: string | null;
  time_slot?: string | null;
  city_id?: string | null;
  district_slug?: string | null;
  work_kind?: string | null;
  pyeong?: number | null;
  ac_types?: string[] | null;
  price_amount?: number | null;
  price_unit?: string | null;
  price_negotiable?: boolean | null;
  trade_side?: string | null;
  trade_client_count?: number | null;
  trade_total_revenue?: number | null;
  trade_regions_in_detail?: boolean | null;
  hiring_employment_type?: "daily" | "full_time" | null;
  subcontract_kind?: "one_time" | "regular" | null;
  regular_frequency_count?: number | null;
  regular_frequency_negotiable?: boolean | null;
  regular_area_in_detail?: boolean | null;
};

export type MagamListingRow = MagamListingPublic & {
  user_id: string;
  contact_phone: string;
  linked_service_disclosed: boolean;
};
