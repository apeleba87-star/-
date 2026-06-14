import type { MagamListingPublic } from "@/lib/magam/types";
import {
  MAGAM_AC_TYPE_LABEL,
  MAGAM_HIRING_WORK_LABEL,
  MAGAM_LISTING_TYPE_LABEL,
  MAGAM_SHARE_WORK_LABEL,
  MAGAM_TIME_SLOT_LABEL,
  MAGAM_WORK_KIND_LABEL,
} from "@/lib/magam/copy";

export type MagamDisplayRow = { label: string; value: string };

/** price_amount — 원 단위 (만원·잔 입력 × 10000) */
export function getMagamPriceWon(listing: MagamListingPublic): number | null {
  if (listing.price_amount != null && listing.price_amount > 0) {
    return listing.price_amount;
  }
  return null;
}

function formatMagamPriceShareLabel(listing: MagamListingPublic): string | null {
  const text = listing.price_text?.trim();
  if (text) return text;

  const won = getMagamPriceWon(listing);
  if (won == null) return null;

  if (listing.price_unit === "jan") {
    return `잔 ${Math.floor(won / 10000)}`;
  }
  const man = Math.floor(won / 10000);
  if (listing.listing_type === "hiring") return `일당 ${man}만원`;
  return `${man}만원`;
}

export function formatMagamPrice(listing: MagamListingPublic): string | null {
  const label = formatMagamPriceShareLabel(listing);
  if (label) return label;
  return null;
}

function formatMagamTimeSlot(listing: MagamListingPublic): string | null {
  if (listing.time_slot) {
    return MAGAM_TIME_SLOT_LABEL[listing.time_slot] ?? listing.time_slot;
  }
  const scheduleText = listing.schedule_text?.trim();
  if (scheduleText?.includes(" · ")) {
    return scheduleText.split(" · ").slice(1).join(" · ");
  }
  return null;
}

/** 카카오·상세 공통 — 일정 + 시간대 */
export function formatMagamScheduleWithTime(listing: MagamListingPublic): string | null {
  let datePart: string | null = null;

  if (listing.schedule_date) {
    const d = new Date(`${listing.schedule_date}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      datePart = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    }
  }

  const time = formatMagamTimeSlot(listing);

  if (!datePart && listing.schedule_text?.trim()) {
    const scheduleText = listing.schedule_text.trim();
    if (scheduleText.includes(" · ")) {
      datePart = scheduleText.split(" · ")[0] ?? scheduleText;
    } else {
      datePart = scheduleText;
    }
  }

  if (datePart) {
    if (time) return `${datePart} / ${time}`;
    return datePart;
  }
  if (time) return time;
  return null;
}

export function formatMagamSchedule(listing: MagamListingPublic): string | null {
  return formatMagamScheduleWithTime(listing);
}

function parseHiringWorkDescription(listing: MagamListingPublic): string | null {
  const body = listing.body_text.trim();
  if (!body) return null;

  let rest = body;
  if (rest.startsWith("구인 · ")) rest = rest.slice("구인 · ".length);
  else if (rest.startsWith("구인·")) rest = rest.slice("구인·".length).trim();

  const segments = rest.split(" · ").map((s) => s.trim()).filter(Boolean);
  const parts: string[] = [];
  for (const seg of segments) {
    if (/^일당\s/.test(seg) || /^\d+만원$/.test(seg) || /^잔\s/.test(seg)) break;
    parts.push(seg);
  }
  return parts.length ? parts.join(" · ") : segments[0] ?? null;
}

/** 카카오 공유·상세 — 작업 한 줄 (금액 포함) */
export function formatMagamWorkSummaryLine(listing: MagamListingPublic): string | null {
  if (listing.listing_type === "hiring") {
    const parts: string[] = [];
    const desc = parseHiringWorkDescription(listing);
    if (desc) parts.push(desc);
    const price = formatMagamPriceShareLabel(listing);
    if (price) parts.push(price);
    if (parts.length === 0) return null;
    return parts.join(" / ");
  }

  const parts: string[] = [];
  parts.push(MAGAM_LISTING_TYPE_LABEL[listing.listing_type] ?? listing.listing_type);

  if (listing.work_kind) {
    parts.push(MAGAM_WORK_KIND_LABEL[listing.work_kind] ?? listing.work_kind);
  }
  if (listing.pyeong != null && listing.pyeong > 0) {
    parts.push(`${listing.pyeong}평`);
  }
  if (listing.ac_types?.length) {
    parts.push(
      listing.ac_types.map((t) => MAGAM_AC_TYPE_LABEL[t] ?? t).join(" / ")
    );
  }

  const price = formatMagamPriceShareLabel(listing);
  if (price) parts.push(price);

  if (parts.length <= 1) {
    const body = listing.body_text.trim().replace(/ · /g, " / ");
    if (!body) return null;
    if (price && !body.includes(price)) return `${body} / ${price}`;
    return body;
  }

  return parts.join(" / ");
}

export function formatMagamWorkSummary(listing: MagamListingPublic): string | null {
  return formatMagamWorkSummaryLine(listing);
}

/** 카카오 공유와 동일한 필드 순서 */
export function getMagamListingDisplayRows(listing: MagamListingPublic): MagamDisplayRow[] {
  const rows: MagamDisplayRow[] = [];

  const schedule = formatMagamScheduleWithTime(listing);
  if (schedule) rows.push({ label: "일정", value: schedule });

  const location = listing.region_gu.trim();
  if (location) rows.push({ label: "위치", value: location });

  const work = formatMagamWorkSummaryLine(listing);
  if (work) {
    const workLabel =
      listing.listing_type === "hiring" ? MAGAM_HIRING_WORK_LABEL : MAGAM_SHARE_WORK_LABEL;
    rows.push({ label: workLabel, value: work });
  }

  const notes = listing.special_notes?.trim();
  if (notes) rows.push({ label: "특이사항", value: notes });

  return rows;
}

export type MagamPriceBucket = "all" | "under_50" | "50_100" | "100_200" | "over_200" | "unset";

export const MAGAM_PRICE_BUCKETS: { value: MagamPriceBucket; label: string }[] = [
  { value: "all", label: "금액 전체" },
  { value: "under_50", label: "50만원 이하" },
  { value: "50_100", label: "50~100만원" },
  { value: "100_200", label: "100~200만원" },
  { value: "over_200", label: "200만원 이상" },
  { value: "unset", label: "금액 미입력" },
];

const WON_50 = 500_000;
const WON_100 = 1_000_000;
const WON_200 = 2_000_000;

export function matchesMagamPriceBucket(won: number | null, bucket: MagamPriceBucket): boolean {
  if (bucket === "all") return true;
  if (bucket === "unset") return won === null;
  if (won === null) return false;
  switch (bucket) {
    case "under_50":
      return won <= WON_50;
    case "50_100":
      return won > WON_50 && won <= WON_100;
    case "100_200":
      return won > WON_100 && won <= WON_200;
    case "over_200":
      return won > WON_200;
    default:
      return true;
  }
}

export const MAGAM_LIVE_TYPES = ["subcontract", "hiring"] as const;
export type MagamLiveListingType = (typeof MAGAM_LIVE_TYPES)[number];

export function isMagamLiveListing(listing: MagamListingPublic): boolean {
  return listing.listing_type === "subcontract" || listing.listing_type === "hiring";
}

export function collectMagamRegions(listings: MagamListingPublic[]): string[] {
  const set = new Set<string>();
  for (const l of listings) {
    if (l.region_gu.trim()) set.add(l.region_gu.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

export function filterMagamLiveListings(
  listings: MagamListingPublic[],
  options: {
    type?: "all" | MagamLiveListingType;
    region?: string;
    priceBucket?: MagamPriceBucket;
  }
): MagamListingPublic[] {
  const { type = "all", region = "", priceBucket = "all" } = options;

  return listings.filter((listing) => {
    if (!isMagamLiveListing(listing)) return false;
    if (type !== "all" && listing.listing_type !== type) return false;
    if (region && listing.region_gu !== region) return false;
    if (!matchesMagamPriceBucket(getMagamPriceWon(listing), priceBucket)) return false;
    return true;
  });
}
