import {
  MAGAM_HIRING_WORK_LABEL,
  MAGAM_LISTING_TYPE_LABEL,
  MAGAM_SHARE_LINK_FOOTER_LINE,
  MAGAM_SHARE_WORK_LABEL,
  MAGAM_TRADE_REGION_DETAIL_REF,
  MAGAM_WORK_KIND_LABEL,
} from "@/lib/magam/copy";
import {
  formatMagamScheduleWithTime,
  formatMagamWorkSummaryLine,
} from "@/lib/magam/format-listing";
import { formatKrMobilePhone } from "@/lib/format/kr-mobile-phone";
import {
  formatMagamTradeClientCount,
  formatMagamTradeSalePrice,
  formatMagamTradeTotalRevenue,
  MAGAM_TRADE_SIDE_LABEL,
  type MagamTradeSide,
} from "@/lib/magam/trade";
import type { MagamListingRow } from "@/lib/magam/types";

function workRowLabel(listing: MagamListingRow): string {
  if (listing.listing_type === "hiring") return MAGAM_HIRING_WORK_LABEL;
  if (listing.listing_type === "trade") return "요약";
  return MAGAM_SHARE_WORK_LABEL;
}

function shareLinkFooter(url: string): string {
  let link = url;
  try {
    const uri = new URL(url);
    if (uri.host === "cleanidex.com") {
      uri.host = "cleanidex.co.kr";
    }
    link = uri.toString();
  } catch {
    /* keep raw */
  }
  return `${MAGAM_SHARE_LINK_FOOTER_LINE}\n${link}`;
}

/** 매매 — 카톡·단톡·복사 본문 (블록 사이 빈 줄) */
export function buildMagamTradeShareBody(listing: MagamListingRow): string {
  const blocks: string[] = [];

  if (listing.trade_side) {
    blocks.push(
      MAGAM_TRADE_SIDE_LABEL[listing.trade_side as MagamTradeSide] ?? listing.trade_side
    );
  }

  const location = listing.region_gu.trim();
  if (location) {
    const regionText = listing.trade_regions_in_detail
      ? `${location} (${MAGAM_TRADE_REGION_DETAIL_REF})`
      : location;
    blocks.push(`활동 지역: ${regionText}`);
  }

  const stats: string[] = [];
  const clients = formatMagamTradeClientCount(listing.trade_client_count);
  if (clients) stats.push(clients);
  const revenue = formatMagamTradeTotalRevenue(listing.trade_total_revenue);
  if (revenue) stats.push(revenue);
  if (stats.length > 0) blocks.push(stats.join(" / "));

  const salePrice = formatMagamTradeSalePrice(listing.price_amount, listing.price_negotiable);
  if (salePrice) blocks.push(salePrice);

  const notes = listing.special_notes?.trim();
  if (notes) blocks.push(`상세 설명: ${notes}`);

  return blocks.join("\n\n");
}

function appendSharePhone(message: string, listing: MagamListingRow, includePhone: boolean): string {
  if (!includePhone || listing.status !== "open" || !listing.contact_phone?.trim()) {
    return message;
  }
  const phone = `연락처: ${formatKrMobilePhone(listing.contact_phone)}`;
  return message ? `${message}\n\n\n${phone}` : phone;
}

/** 카카오·링크 공유용 문구 */
export function buildMagamShareMessage(
  listing: MagamListingRow,
  url: string,
  includePhone = false
): string {
  if (listing.listing_type === "trade") {
    const message = appendSharePhone(buildMagamTradeShareBody(listing), listing, includePhone);
    const footer = shareLinkFooter(url);
    return message ? `${message}\n\n${footer}` : footer;
  }

  const blocks: string[] = [];

  const schedule = formatMagamScheduleWithTime(listing);
  if (schedule) blocks.push(`일정: ${schedule}`);

  const location = listing.region_gu.trim();
  if (location) blocks.push(`위치: ${location}`);

  const work = formatMagamWorkSummaryLine(listing);
  if (work) blocks.push(`${workRowLabel(listing)}: ${work}`);

  const notes = listing.special_notes?.trim();
  if (notes) blocks.push(`특이사항: ${notes}`);

  let message = appendSharePhone(blocks.join("\n\n"), listing, includePhone);
  const footer = shareLinkFooter(url);
  return message ? `${message}\n\n${footer}` : footer;
}

function naverCafeTitle(listing: MagamListingRow): string | null {
  const parts: string[] = [];
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"] as const;

  if (listing.schedule_date) {
    const d = new Date(`${listing.schedule_date}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      parts.push(`${d.getMonth() + 1}.${d.getDate()}(${weekdays[d.getDay()]})`);
    }
  }

  const location = listing.region_gu.trim();
  if (location) {
    const tokens = location.split(/\s+/);
    parts.push(tokens.length > 1 ? tokens[tokens.length - 1]! : location);
  }

  if (listing.listing_type === "hiring") {
    const body = listing.body_text.trim();
    let rest = body;
    if (rest.startsWith("구인 · ")) rest = rest.slice("구인 · ".length);
    const desc = rest.split(" · ")[0]?.trim();
    if (desc) parts.push(desc);
  } else if (listing.listing_type === "trade") {
    if (listing.trade_side) {
      parts.push(
        MAGAM_TRADE_SIDE_LABEL[listing.trade_side as MagamTradeSide] ?? listing.trade_side
      );
    }
  } else if (listing.work_kind) {
    parts.push(MAGAM_WORK_KIND_LABEL[listing.work_kind] ?? listing.work_kind);
  }

  const price = listing.price_text?.trim();
  if (price) parts.push(price);

  if (listing.listing_type === "hiring") {
    parts.push(MAGAM_LISTING_TYPE_LABEL.hiring);
  }

  const title = parts.filter(Boolean).join(" ");
  return title || null;
}

/** 네이버 카페 붙여넣기용 */
export function buildMagamNaverCafeMessage(
  listing: MagamListingRow,
  url: string,
  includePhone = false
): string {
  if (listing.listing_type === "trade") {
    const message = appendSharePhone(buildMagamTradeShareBody(listing), listing, includePhone);
    const footer = shareLinkFooter(url);
    const body = message ? `${message}\n\n${footer}` : footer;
    const title = naverCafeTitle(listing);
    return title ? `${title}\n\n${body}` : body;
  }

  const lines: string[] = [];

  const title = naverCafeTitle(listing);
  if (title) {
    lines.push(title, "");
  }

  function addBullet(label: string, value: string) {
    const v = value.trim();
    if (v) lines.push(`● ${label} : ${v}`);
  }

  const schedule = formatMagamScheduleWithTime(listing);
  if (schedule) addBullet("일정", schedule);

  const location = listing.region_gu.trim();
  if (location) addBullet("위치", location);

  const work = formatMagamWorkSummaryLine(listing);
  if (work) addBullet(workRowLabel(listing), work);

  const notes = listing.special_notes?.trim();
  if (notes) {
    if (notes.includes("\n")) {
      lines.push("● 특이사항");
      for (const line of notes.split("\n")) {
        const t = line.trim();
        if (t) lines.push(`  - ${t}`);
      }
    } else {
      addBullet("특이사항", notes);
    }
  }

  if (includePhone && listing.status === "open" && listing.contact_phone?.trim()) {
    addBullet("연락", formatKrMobilePhone(listing.contact_phone));
  }

  if (lines.length > 0) lines.push("");
  lines.push(shareLinkFooter(url).replace(/\n/g, "\n"));

  return lines.join("\n");
}
