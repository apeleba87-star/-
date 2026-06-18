import type { MagamListingPublic } from "@/lib/magam/types";
import {
  MAGAM_AC_TYPE_LABEL,
  MAGAM_HIRING_WORK_LABEL,
  MAGAM_LISTING_TYPE_LABEL,
  MAGAM_SHARE_WORK_LABEL,
  MAGAM_TIME_SLOT_LABEL,
  MAGAM_TRADE_REGION_DETAIL_REF,
  MAGAM_WORK_KIND_LABEL,
} from "@/lib/magam/copy";
import {
  formatMagamTradeClientCount,
  formatMagamTradeSalePrice,
  formatMagamTradeTotalRevenue,
  MAGAM_TRADE_SIDE_LABEL,
} from "@/lib/magam/trade";

export const MAGAM_TRADE_DETAIL_ANCHOR = "magam-trade-detail";

export type MagamDisplayRow = {
  label: string;
  value: string;
  detailAnchor?: string;
};

/** price_amount — 원 단위 (만원·잔 입력 × 10000) */
export function getMagamPriceWon(listing: MagamListingPublic): number | null {
  if (listing.price_amount != null && listing.price_amount > 0) {
    return listing.price_amount;
  }
  return null;
}

function formatMagamPriceShareLabel(listing: MagamListingPublic): string | null {
  if (listing.listing_type === "trade") {
    return formatMagamTradeSalePrice(getMagamPriceWon(listing), listing.price_negotiable);
  }

  const text = listing.price_text?.trim();
  if (text) return text;

  const won = getMagamPriceWon(listing);
  if (won == null) return null;

  if (listing.price_unit === "jan") {
    return `잔 ${Math.floor(won / 10000)}`;
  }
  const man = Math.floor(won / 10000);
  if (listing.listing_type === "hiring") {
    return listing.hiring_employment_type === "full_time"
      ? `월급 ${man.toLocaleString("ko-KR")}만원`
      : `일당 ${man}만원`;
  }
  return `${man}만원`;
}

export function formatMagamPrice(listing: MagamListingPublic): string | null {
  const label = formatMagamPriceShareLabel(listing);
  if (label) return label;
  return null;
}

export function formatMagamFullTimeSalary(listing: MagamListingPublic): string | null {
  if (listing.listing_type !== "hiring" || listing.hiring_employment_type !== "full_time") {
    return null;
  }

  const price = formatMagamPriceShareLabel(listing);
  if (!price) return null;
  return price.replace(/^월급\s*/, "");
}

function isRegularSubcontract(listing: MagamListingPublic): boolean {
  return listing.listing_type === "subcontract" && listing.subcontract_kind === "regular";
}

export function formatMagamRegularFrequency(listing: MagamListingPublic): string | null {
  if (!isRegularSubcontract(listing)) return null;
  if (listing.regular_frequency_negotiable) return "협의";
  if (listing.regular_frequency_count != null && listing.regular_frequency_count > 0) {
    return `주 ${listing.regular_frequency_count}회`;
  }
  return listing.schedule_text?.trim() || null;
}

export function formatMagamRegularArea(listing: MagamListingPublic): string | null {
  if (!isRegularSubcontract(listing)) return null;
  if (listing.regular_area_in_detail) return "상세 설명 참조";
  if (listing.pyeong != null && listing.pyeong > 0) return `${listing.pyeong}평`;
  return null;
}

export function formatMagamRegularMonthlyPrice(listing: MagamListingPublic): string | null {
  if (!isRegularSubcontract(listing)) return null;
  const price = formatMagamPriceShareLabel(listing);
  if (!price) return null;
  return price.replace(/^월 도급금\s*/, "");
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
  else if (rest.startsWith("일당 구인 · ")) rest = rest.slice("일당 구인 · ".length);
  else if (rest.startsWith("정규직 구인 · ")) rest = rest.slice("정규직 구인 · ".length);

  const segments = rest.split(" · ").map((s) => s.trim()).filter(Boolean);
  const parts: string[] = [];
  for (const seg of segments) {
    if (/^일당\s/.test(seg) || /^월급\s/.test(seg) || /^급여\s/.test(seg) || /^\d+만원$/.test(seg) || /^잔\s/.test(seg)) break;
    if (seg === "일당" || seg === "정규직") continue;
    parts.push(seg);
  }
  return parts.length ? parts.join(" · ") : segments[0] ?? null;
}

/** 카카오 공유·상세 — 작업 한 줄 (금액 포함) */
export function formatMagamWorkSummaryLine(listing: MagamListingPublic): string | null {
  if (listing.listing_type === "trade") {
    const parts: string[] = [];
    if (listing.trade_side) {
      parts.push(
        MAGAM_TRADE_SIDE_LABEL[listing.trade_side as keyof typeof MAGAM_TRADE_SIDE_LABEL] ??
          listing.trade_side
      );
    }
    const clients = formatMagamTradeClientCount(listing.trade_client_count);
    if (clients) parts.push(clients);
    const revenue = formatMagamTradeTotalRevenue(listing.trade_total_revenue);
    if (revenue) parts.push(revenue);
    const price = formatMagamPriceShareLabel(listing);
    if (price) parts.push(price);
    if (parts.length === 0) {
      const body = listing.body_text.trim();
      return body || null;
    }
    return parts.join(" / ");
  }

  if (isRegularSubcontract(listing)) {
    const parts = ["정기청소"];
    if (listing.work_kind) {
      parts.push(MAGAM_WORK_KIND_LABEL[listing.work_kind] ?? listing.work_kind);
    }
    return parts.join(" / ");
  }

  if (listing.listing_type === "hiring") {
    const parts: string[] = [];
    if (listing.hiring_employment_type === "full_time") parts.push("정규직");
    else parts.push("일당");
    const desc = parseHiringWorkDescription(listing);
    if (desc) parts.push(desc);
    if (listing.hiring_employment_type !== "full_time") {
      const price = formatMagamPriceShareLabel(listing);
      if (price) parts.push(price);
    }
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

export function magamWorkRowLabel(listing: MagamListingPublic): string {
  if (listing.listing_type === "hiring") {
    return listing.hiring_employment_type === "full_time" ? "상세 설명" : MAGAM_HIRING_WORK_LABEL;
  }

  return MAGAM_SHARE_WORK_LABEL;
}

/** 목록 한 줄 — 도급 · 동작구 · 18평 · 24만 · 6/15 */
export function formatMagamScheduleShort(listing: MagamListingPublic): string | null {
  if (listing.schedule_date) {
    const d = new Date(`${listing.schedule_date}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
  }

  const scheduleText = listing.schedule_text?.trim();
  if (!scheduleText) return null;

  const datePart = scheduleText.includes(" · ")
    ? scheduleText.split(" · ")[0]?.trim()
    : scheduleText;
  if (!datePart) return null;

  const m = datePart.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (m) return `${m[1]}/${m[2]}`;

  return datePart.length <= 12 ? datePart : null;
}

export function formatMagamListingPeekBody(listing: MagamListingPublic): string {
  const parts: string[] = [];

  const region = listing.region_gu.trim();
  if (region) parts.push(region);

  if (isRegularSubcontract(listing)) {
    const frequency = formatMagamRegularFrequency(listing);
    if (frequency) parts.push(frequency);
    const work = formatMagamWorkSummaryLine(listing)?.replace(/^정기청소\s*\/\s*/, "");
    if (work) parts.push(work);
    const monthly = formatMagamRegularMonthlyPrice(listing);
    if (monthly) parts.push(monthly === "월 도급금 협의" ? "협의" : monthly);
    return parts.join(" · ");
  }

  if (listing.listing_type === "hiring" && listing.hiring_employment_type === "full_time") {
    const salary = formatMagamFullTimeSalary(listing);
    if (salary) parts.push(salary === "급여 협의" ? salary : `월급 ${salary}`);
    return parts.join(" · ");
  }

  let work = formatMagamWorkSummaryLine(listing);
  if (work) {
    if (listing.listing_type === "subcontract") {
      work = work.replace(/^도급\s*\/\s*/, "");
    }
    if (listing.listing_type === "trade") {
      work = work.replace(/^양도\(팝니다\)\s*\/\s*/, "");
      work = work.replace(/^양수\(삽니다\)\s*\/\s*/, "");
    }
    if (work) parts.push(work);
  }

  if (listing.listing_type !== "trade") {
    const schedule = formatMagamScheduleShort(listing);
    if (schedule) parts.push(schedule);
  }

  return parts.join(" · ");
}

export function formatMagamListingPeekLine(listing: MagamListingPublic): string {
  const type = MAGAM_LISTING_TYPE_LABEL[listing.listing_type];
  const body = formatMagamListingPeekBody(listing);
  return body ? `${type} · ${body}` : type;
}

/** 카카오 공유와 동일한 필드 순서 */
export function getMagamListingDisplayRows(listing: MagamListingPublic): MagamDisplayRow[] {
  const rows: MagamDisplayRow[] = [];

  if (listing.listing_type === "trade") {
    if (listing.trade_side) {
      rows.push({
        label: "매매",
        value:
          MAGAM_TRADE_SIDE_LABEL[listing.trade_side as keyof typeof MAGAM_TRADE_SIDE_LABEL] ??
          listing.trade_side,
      });
    }

    const location = listing.region_gu.trim();
    const notes = listing.special_notes?.trim();
    if (location) {
      const regionValue = listing.trade_regions_in_detail
        ? `${location} · ${MAGAM_TRADE_REGION_DETAIL_REF}`
        : location;
      rows.push({ label: "활동 지역", value: regionValue });
    }

    const clients =
      listing.trade_client_count != null && listing.trade_client_count > 0
        ? `${listing.trade_client_count}곳`
        : null;
    if (clients) rows.push({ label: "거래처 수", value: clients });

    if (listing.trade_total_revenue != null && listing.trade_total_revenue > 0) {
      const man = Math.floor(listing.trade_total_revenue / 10_000);
      rows.push({ label: "총 매출", value: `${man.toLocaleString("ko-KR")}만` });
    }

    const price = formatMagamPriceShareLabel(listing);
    if (price) {
      const saleValue = listing.price_negotiable
        ? "협의"
        : listing.price_amount != null && listing.price_amount > 0
          ? `${Math.floor(listing.price_amount / 10_000).toLocaleString("ko-KR")}만`
          : price.replace(/^희망판매\s*/, "");
      rows.push({ label: "희망 판매가", value: saleValue });
    }

    if (notes) {
      rows.push({
        label: "상세 설명",
        value: notes,
        detailAnchor: MAGAM_TRADE_DETAIL_ANCHOR,
      });
    }

    return rows;
  }

  const schedule =
    (listing.listing_type === "hiring" && listing.hiring_employment_type === "full_time") ||
    isRegularSubcontract(listing)
      ? null
      : formatMagamScheduleWithTime(listing);
  if (schedule) rows.push({ label: "일정", value: schedule });

  const location = listing.region_gu.trim();
  if (location) {
    rows.push({
      label:
        listing.listing_type === "hiring" && listing.hiring_employment_type === "full_time"
          ? "근무 지역"
          : "위치",
      value: location,
    });
  }

  if (isRegularSubcontract(listing)) {
    const frequency = formatMagamRegularFrequency(listing);
    if (frequency) rows.push({ label: "정기 주기", value: frequency });

    const work = formatMagamWorkSummaryLine(listing);
    if (work) rows.push({ label: MAGAM_SHARE_WORK_LABEL, value: work });

    const area = formatMagamRegularArea(listing);
    if (area) rows.push({ label: "면적", value: area });

    const monthly = formatMagamRegularMonthlyPrice(listing);
    if (monthly) rows.push({ label: "월 도급금", value: monthly });

    const notes = listing.special_notes?.trim();
    if (notes) rows.push({ label: "상세 설명", value: notes });

    return rows;
  }

  const fullTimeSalary = formatMagamFullTimeSalary(listing);
  if (fullTimeSalary) rows.push({ label: "월급", value: fullTimeSalary });

  const work = formatMagamWorkSummaryLine(listing);
  if (work) {
    rows.push({ label: magamWorkRowLabel(listing), value: work });
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

export const MAGAM_LIVE_TYPES = ["subcontract", "hiring", "trade"] as const;
export type MagamLiveListingType = (typeof MAGAM_LIVE_TYPES)[number];

export function isMagamLiveListing(listing: MagamListingPublic): boolean {
  return (
    listing.listing_type === "subcontract" ||
    listing.listing_type === "hiring" ||
    listing.listing_type === "trade"
  );
}

export function collectMagamRegions(listings: MagamListingPublic[]): string[] {
  const set = new Set<string>();
  for (const l of listings) {
    if (l.region_gu.trim()) set.add(l.region_gu.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

export type MagamTradePriceBucket =
  | "all"
  | "under_1000"
  | "1000_3000"
  | "over_3000"
  | "negotiable"
  | "unset";

export const MAGAM_TRADE_PRICE_BUCKETS: { value: MagamTradePriceBucket; label: string }[] = [
  { value: "all", label: "희망 판매가 전체" },
  { value: "under_1000", label: "1천만 이하" },
  { value: "1000_3000", label: "1천~3천만" },
  { value: "over_3000", label: "3천만 이상" },
  { value: "negotiable", label: "협의" },
  { value: "unset", label: "미입력" },
];

const WON_1000_MAN = 10_000_000;
const WON_3000_MAN = 30_000_000;

export function matchesMagamTradePriceBucket(
  listing: MagamListingPublic,
  bucket: MagamTradePriceBucket
): boolean {
  if (bucket === "all") return true;
  if (bucket === "negotiable") return Boolean(listing.price_negotiable);
  if (bucket === "unset") {
    return !listing.price_negotiable && getMagamPriceWon(listing) === null;
  }
  const won = getMagamPriceWon(listing);
  if (won === null || listing.price_negotiable) return false;
  switch (bucket) {
    case "under_1000":
      return won <= WON_1000_MAN;
    case "1000_3000":
      return won > WON_1000_MAN && won <= WON_3000_MAN;
    case "over_3000":
      return won > WON_3000_MAN;
    default:
      return true;
  }
}

export function filterMagamLiveListings(
  listings: MagamListingPublic[],
  options: {
    type?: "all" | MagamLiveListingType;
    region?: string;
    priceBucket?: MagamPriceBucket;
    tradePriceBucket?: MagamTradePriceBucket;
  }
): MagamListingPublic[] {
  const { type = "all", region = "", priceBucket = "all", tradePriceBucket = "all" } = options;

  return listings.filter((listing) => {
    if (!isMagamLiveListing(listing)) return false;
    if (type !== "all" && listing.listing_type !== type) return false;
    if (region && listing.region_gu !== region) return false;
    if (listing.listing_type === "trade") {
      if (!matchesMagamTradePriceBucket(listing, tradePriceBucket)) return false;
    } else if (!matchesMagamPriceBucket(getMagamPriceWon(listing), priceBucket)) {
      return false;
    }
    return true;
  });
}
