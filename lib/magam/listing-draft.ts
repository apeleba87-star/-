import {
  MAGAM_AC_TYPE_LABEL,
  MAGAM_LISTING_TYPE_LABEL,
  MAGAM_TIME_SLOT_LABEL,
  MAGAM_WORK_KIND_LABEL,
} from "@/lib/magam/copy";
import { magamRegionDisplayLabel } from "@/lib/magam/regions";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type MagamListingDraft = {
  listingType: "subcontract" | "hiring";
  cityId: string;
  districtSlug: string;
  workKind?: string | null;
  workDescription?: string | null;
  scheduleDate?: string | null;
  timeSlot?: string | null;
  pyeong?: number | null;
  acTypes?: string[];
  otherDetail?: string | null;
  specialNotes?: string | null;
  priceAmount?: number | null;
  priceUnit?: "man" | "jan";
};

export function parseMagamPriceManInput(text: string): number | null {
  const trimmed = text.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n * 10_000;
}

function scheduleLabel(draft: MagamListingDraft): string | null {
  const parts: string[] = [];
  if (draft.scheduleDate) {
    const d = new Date(`${draft.scheduleDate}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      parts.push(
        `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
      );
    }
  }
  if (draft.timeSlot) {
    parts.push(MAGAM_TIME_SLOT_LABEL[draft.timeSlot] ?? draft.timeSlot);
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function priceLabel(draft: MagamListingDraft): string | null {
  if (draft.priceAmount == null || draft.priceAmount <= 0) return null;
  if (draft.priceUnit === "jan") {
    return `잔 ${Math.floor(draft.priceAmount / 10_000)}`;
  }
  const man = Math.floor(draft.priceAmount / 10_000);
  if (draft.listingType === "hiring") return `일당 ${man}만원`;
  return `${man}만원`;
}

export function buildMagamBodyText(draft: MagamListingDraft): string {
  const regionLabel = magamRegionDisplayLabel(draft.cityId, draft.districtSlug);
  const type = MAGAM_LISTING_TYPE_LABEL[draft.listingType] ?? draft.listingType;

  if (draft.listingType === "hiring") {
    const desc = draft.workDescription?.trim() ?? "";
    const parts: string[] = [type];
    if (desc) parts.push(desc);
    const price = priceLabel(draft);
    if (price) parts.push(price);
    let text = parts.join(" · ");
    if (text.length < 4) text = `${text} · ${regionLabel}`;
    return text;
  }

  const work = MAGAM_WORK_KIND_LABEL[draft.workKind ?? ""] ?? draft.workKind ?? "";
  const parts: string[] = [type, work];

  if (draft.workKind === "move_in_new" || draft.workKind === "move_out") {
    if (draft.pyeong != null) parts.push(`${draft.pyeong}평`);
  }
  if (draft.workKind === "ac" && draft.acTypes?.length) {
    parts.push(draft.acTypes.map((t) => MAGAM_AC_TYPE_LABEL[t] ?? t).join(", "));
  }
  if (draft.workKind === "other" && draft.otherDetail?.trim()) {
    parts.push(draft.otherDetail.trim());
  }

  let text = parts.join(" · ");
  if (text.length < 4) text = `${text} · ${regionLabel}`;
  return text;
}

export function buildMagamPreviewLine(draft: MagamListingDraft): string {
  const regionLabel = magamRegionDisplayLabel(draft.cityId, draft.districtSlug);
  const sched = scheduleLabel(draft);
  const price = priceLabel(draft);

  if (draft.listingType === "hiring") {
    const chunks: string[] = [];
    if (sched) chunks.push(sched);
    chunks.push(regionLabel);
    const desc = draft.workDescription?.trim();
    if (desc) chunks.push(desc);
    if (price) chunks.push(price);
    if (draft.specialNotes?.trim()) chunks.push("특이사항 있음");
    return chunks.join(" · ");
  }

  const chunks: string[] = [];
  if (sched) chunks.push(sched);
  chunks.push(regionLabel);
  if (draft.workKind) {
    chunks.push(MAGAM_WORK_KIND_LABEL[draft.workKind] ?? draft.workKind);
  }
  if (draft.pyeong != null) chunks.push(`${draft.pyeong}평`);
  if (price) chunks.push(price);
  if (draft.specialNotes?.trim()) chunks.push("특이사항 있음");
  return chunks.join(" · ");
}

export function magamScheduleText(draft: MagamListingDraft): string | null {
  return scheduleLabel(draft);
}

export function magamPriceText(draft: MagamListingDraft): string | null {
  return priceLabel(draft);
}
