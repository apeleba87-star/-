import {
  MAGAM_HIRING_WORK_LABEL,
  MAGAM_LISTING_TYPE_LABEL,
  MAGAM_SHARE_LINK_ARROWS,
  MAGAM_SHARE_LINK_CTA_BRACKET,
  MAGAM_SHARE_WORK_LABEL,
  MAGAM_WORK_KIND_LABEL,
} from "@/lib/magam/copy";
import {
  formatMagamScheduleWithTime,
  formatMagamWorkSummaryLine,
} from "@/lib/magam/format-listing";
import { formatKrMobilePhone } from "@/lib/format/kr-mobile-phone";
import type { MagamListingRow } from "@/lib/magam/types";

function workRowLabel(listing: MagamListingRow): string {
  return listing.listing_type === "hiring" ? MAGAM_HIRING_WORK_LABEL : MAGAM_SHARE_WORK_LABEL;
}

function shareLinkFooter(url: string): string {
  let link = url;
  try {
    const uri = new URL(url);
    if (uri.host === "cleanidex.com") {
      link = url.replace("cleanidex.com", "cleanidex.co.kr");
    } else {
      link = `${uri.host}${uri.pathname}`;
    }
  } catch {
    /* keep raw */
  }
  return [MAGAM_SHARE_LINK_CTA_BRACKET, MAGAM_SHARE_LINK_ARROWS, link].join("\n");
}

/** 카카오·링크 공유용 문구 */
export function buildMagamShareMessage(
  listing: MagamListingRow,
  url: string,
  includePhone = false
): string {
  const blocks: string[] = [];

  const schedule = formatMagamScheduleWithTime(listing);
  if (schedule) blocks.push(`일정: ${schedule}`);

  const location = listing.region_gu.trim();
  if (location) blocks.push(`위치: ${location}`);

  const work = formatMagamWorkSummaryLine(listing);
  if (work) blocks.push(`${workRowLabel(listing)}: ${work}`);

  const notes = listing.special_notes?.trim();
  if (notes) blocks.push(`특이사항: ${notes}`);

  let message = blocks.join("\n\n");

  if (includePhone && listing.status === "open" && listing.contact_phone?.trim()) {
    const phone = `연락처: ${formatKrMobilePhone(listing.contact_phone)}`;
    message = message ? `${message}\n\n\n${phone}` : phone;
  }

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
