/** 내 공고·실시간 목록 카드용 — 연락처·slug 등 상세 전용 컬럼 제외 */
export const MAGAM_LISTING_CARD_SELECT =
  "id, listing_type, region_gu, body_text, status, created_at, closed_at, schedule_date, time_slot, work_kind, pyeong, ac_types, price_amount, price_unit, special_notes";

/** 소유자 상세·글쓰기·마감 처리용 */
export const MAGAM_LISTING_OWNER_SELECT =
  "id, user_id, listing_type, region_gu, body_text, contact_phone, price_text, schedule_text, special_notes, status, share_slug, linked_service_disclosed, created_at, updated_at, closed_at, schedule_date, time_slot, city_id, district_slug, work_kind, pyeong, ac_types, price_amount, price_unit";
