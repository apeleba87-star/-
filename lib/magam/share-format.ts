import {
  MAGAM_LISTING_TYPE_LABEL,
  MAGAM_SHARE_LINK_FOOTER_LINE,
  MAGAM_WORK_KIND_LABEL,
} from "@/lib/magam/copy";
import {
  formatMagamFullTimeSalary,
  formatMagamRegularArea,
  formatMagamRegularFrequency,
  formatMagamRegularMonthlyPrice,
  formatMagamScheduleWithTime,
  formatMagamWorkSummaryLine,
  magamWorkRowLabel,
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
  if (listing.listing_type === "trade") return "요약";
  return magamWorkRowLabel(listing);
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

function summarizeShareText(text: string, maxLength = 90): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

/** 매매 — 카톡·단톡·복사 본문 (블록 사이 빈 줄) */
export function buildMagamTradeShareBody(listing: MagamListingRow): string {
  const blocks: string[] = [];

  const tradeTitle = listing.trade_side === "buy" ? "청소 매매(구매)" : "청소 매매(판매)";
  blocks.push(tradeTitle);

  const location = listing.region_gu.trim();
  if (location) {
    const regionText = listing.trade_regions_in_detail
      ? `대표지역 ${location} (아래 상세 참조)`
      : location;
    blocks.push(`매매 지역: ${regionText}`);
  }

  const stats: string[] = [];
  const clients = formatMagamTradeClientCount(listing.trade_client_count);
  if (clients) stats.push(clients);
  const revenue = formatMagamTradeTotalRevenue(listing.trade_total_revenue);
  if (revenue) stats.push(revenue);
  if (stats.length > 0) blocks.push(stats.join(" / "));

  const salePrice = formatMagamTradeSalePrice(listing.price_amount, listing.price_negotiable);
  if (salePrice) blocks.push(salePrice.replace(/^희망판매/, "판매가"));

  const notes = listing.special_notes?.trim();
  if (notes) blocks.push(`상세 요약: ${summarizeShareText(notes)}`);

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

  const location = listing.region_gu.trim();
  if (location) blocks.push(`위치: ${location}`);

  if (listing.listing_type === "subcontract" && listing.subcontract_kind === "regular") {
    const frequency = formatMagamRegularFrequency(listing);
    if (frequency) blocks.push(`정기 주기: ${frequency}`);

    const work = formatMagamWorkSummaryLine(listing);
    if (work) blocks.push(`${workRowLabel(listing)}: ${work}`);

    const area = formatMagamRegularArea(listing);
    if (area) blocks.push(`면적: ${area}`);

    const monthly = formatMagamRegularMonthlyPrice(listing);
    if (monthly) blocks.push(`월 도급금: ${monthly}`);

    const notes = listing.special_notes?.trim();
    if (notes) blocks.push(`상세 설명\n${notes}`);

    const message = appendSharePhone(blocks.join("\n\n"), listing, includePhone);
    const footer = shareLinkFooter(url);
    return message ? `${message}\n\n${footer}` : footer;
  }

  const schedule = formatMagamScheduleWithTime(listing);
  if (schedule) blocks.unshift(`일정: ${schedule}`);

  const fullTimeSalary = formatMagamFullTimeSalary(listing);
  if (fullTimeSalary) blocks.push(`월급: ${fullTimeSalary}`);

  const work = formatMagamWorkSummaryLine(listing);
  if (work) {
    blocks.push(
      listing.listing_type === "hiring" && listing.hiring_employment_type === "full_time"
        ? `${workRowLabel(listing)}\n${work}`
        : `${workRowLabel(listing)}: ${work}`
    );
  }

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

  if (listing.listing_type === "hiring" && listing.hiring_employment_type !== "full_time") {
    const body = listing.body_text.trim();
    let rest = body;
    if (rest.startsWith("구인 · ")) rest = rest.slice("구인 · ".length);
    else if (rest.startsWith("구인·")) rest = rest.slice("구인·".length).trim();
    else if (rest.startsWith("일당 구인 · ")) rest = rest.slice("일당 구인 · ".length);
    else if (rest.startsWith("정규직 구인 · ")) rest = rest.slice("정규직 구인 · ".length);
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

  if (listing.listing_type === "subcontract" && listing.subcontract_kind === "regular") {
    const frequency = formatMagamRegularFrequency(listing);
    if (frequency) addBullet("정기 주기", frequency);

    const work = formatMagamWorkSummaryLine(listing);
    if (work) addBullet(workRowLabel(listing), work);

    const area = formatMagamRegularArea(listing);
    if (area) addBullet("면적", area);

    const monthly = formatMagamRegularMonthlyPrice(listing);
    if (monthly) addBullet("월 도급금", monthly);

    const notes = listing.special_notes?.trim();
    if (notes) {
      lines.push("● 상세 설명");
      for (const line of notes.split("\n")) {
        const t = line.trim();
        if (t) lines.push(`  - ${t}`);
      }
    }

    if (includePhone && listing.status === "open" && listing.contact_phone?.trim()) {
      addBullet("연락", formatKrMobilePhone(listing.contact_phone));
    }

    if (lines.length > 0) lines.push("");
    lines.push(shareLinkFooter(url).replace(/\n/g, "\n"));
    return lines.join("\n");
  }

  const fullTimeSalary = formatMagamFullTimeSalary(listing);
  if (fullTimeSalary) addBullet("월급", fullTimeSalary);

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
