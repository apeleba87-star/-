export const MAGAM_LISTING_TYPES = ["subcontract", "hiring", "trade"] as const;
export type MagamListingType = (typeof MAGAM_LISTING_TYPES)[number];

export const MAGAM_LISTING_STATUSES = ["open", "closed"] as const;
export type MagamListingStatus = (typeof MAGAM_LISTING_STATUSES)[number];

export type MagamListingPublic = {
  id: string;
  user_id: string;
  listing_type: MagamListingType;
  region_gu: string;
  body_text: string;
  contact_phone: string | null;
  price_text: string | null;
  schedule_text: string | null;
  special_notes: string | null;
  status: MagamListingStatus;
  share_slug: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type MagamListingRow = MagamListingPublic & {
  contact_phone: string;
  linked_service_disclosed: boolean;
};
