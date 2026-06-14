import type { MagamListingPublic } from "@/lib/magam/types";
import { MAGAM_TIME_SLOT_LABEL, MAGAM_WORK_KIND_LABEL } from "@/lib/magam/copy";

/** price_amount — 원 단위 (만원·잔 입력 × 10000) */
export function getMagamPriceWon(listing: MagamListingPublic): number | null {
  if (listing.price_amount != null && listing.price_amount > 0) {
    return listing.price_amount;
  }
  return null;
}

export function formatMagamPrice(listing: MagamListingPublic): string | null {
  const won = getMagamPriceWon(listing);
  if (won == null) {
    const t = listing.price_text?.trim();
    return t || null;
  }
  if (listing.price_unit === "jan") {
    return `잔 ${Math.floor(won / 10000)}`;
  }
  const man = Math.floor(won / 10000);
  return `${man.toLocaleString("ko-KR")}만원`;
}

export function formatMagamSchedule(listing: MagamListingPublic): string | null {
  if (listing.schedule_text?.trim()) return listing.schedule_text.trim();
  const parts: string[] = [];
  if (listing.schedule_date) {
    const d = new Date(`${listing.schedule_date}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
      parts.push(
        `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} (${weekdays[d.getDay()]})`
      );
    }
  }
  if (listing.time_slot) {
    parts.push(MAGAM_TIME_SLOT_LABEL[listing.time_slot] ?? listing.time_slot);
  }
  return parts.length ? parts.join(" · ") : null;
}

export function formatMagamWorkSummary(listing: MagamListingPublic): string | null {
  const parts: string[] = [];
  if (listing.work_kind) {
    parts.push(MAGAM_WORK_KIND_LABEL[listing.work_kind] ?? listing.work_kind);
  }
  if (listing.pyeong != null && listing.pyeong > 0) {
    parts.push(`${listing.pyeong}평`);
  }
  if (listing.ac_types?.length) {
    parts.push(listing.ac_types.join(", "));
  }
  return parts.length ? parts.join(" · ") : null;
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
