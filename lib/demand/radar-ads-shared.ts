/** 클라이언트·서버 공용 — Supabase/headers 의존 없음 */

import type { RadarAdImageCrop } from "@/lib/demand/radar-ad-image-crop";

/** 입주레이더 광고 이미지 가이드 — 관리자·광고주 안내용 */
export const RADAR_AD_IMAGE_SPEC = {
  aspectRatio: "3:1",
  recommendedWidth: 1200,
  recommendedHeight: 400,
  minWidth: 600,
  minHeight: 200,
  maxFileSizeKb: 500,
  formats: ["image/jpeg", "image/png", "image/webp"] as const,
  formatLabels: "JPG · PNG · WebP",
  safeZoneNote:
    "로고·문구는 노출 영역(안전선) 안에 두세요. 영역 밖은 허브 배너에 잘립니다.",
  adminSummary:
    "권장 1200×400px (3:1) · 최소 600×200px · 500KB 이하 · JPG/PNG/WebP",
} as const;

/**
 * 입주레이더 광고 배너 하단 보조 문구 기준 권장 최대 글자 수.
 * 이미지 배너에 문구가 포함된 경우 비워 두어도 됩니다.
 */
export const RADAR_AD_COPY_LIMITS = {
  /** 배너 하단 1줄 (10px, truncate) */
  advertiserName: 16,
  /** 제목 2줄 (14px semibold, line-clamp-2) */
  title: 28,
  /** 설명 2줄 (12px, line-clamp-2) */
  description: 36,
  /** CTA 버튼 (11px) */
  ctaText: 8,
} as const;

export type RadarAdCopyField = keyof typeof RADAR_AD_COPY_LIMITS;

export function clampRadarAdCopy(field: RadarAdCopyField, value: string): string {
  const max = RADAR_AD_COPY_LIMITS[field];
  return [...value].slice(0, max).join("");
}

export function radarAdCopyLength(value: string): number {
  return [...value].length;
}

export function validateRadarAdCopy(fields: {
  advertiser_name: string;
  title: string;
  description: string;
  cta_text: string;
}): string | null {
  const title = fields.title.trim();
  if (!title) return "제목을 입력하세요.";

  const checks: { field: RadarAdCopyField; value: string; label: string }[] = [
    { field: "advertiserName", value: fields.advertiser_name, label: "업체명" },
    { field: "title", value: title, label: "제목" },
    { field: "description", value: fields.description, label: "설명" },
    { field: "ctaText", value: fields.cta_text, label: "버튼 문구" },
  ];

  for (const { field, value, label } of checks) {
    const max = RADAR_AD_COPY_LIMITS[field];
    if (radarAdCopyLength(value) > max) {
      return `${label}은(는) ${max}자 이내로 입력하세요.`;
    }
  }
  return null;
}

export type RadarAdScope = "national" | "regional";

export type RadarAdSlotCategory = "waste" | "restaurant" | "life" | "other";

export const RADAR_AD_SLOT_CATEGORY_LABELS: Record<RadarAdSlotCategory, string> = {
  waste: "폐기물·대형폐기물",
  restaurant: "식당·배달",
  life: "생활·이사 연계",
  other: "기타",
};

export type RadarAdSlotStatus = "draft" | "active" | "paused";

export type RadarAdSlot = {
  id: string;
  slotIndex: number;
  category: RadarAdSlotCategory;
  title: string;
  description: string | null;
  imageUrl: string | null;
  imageCrop: RadarAdImageCrop;
  ctaText: string;
  ctaUrl: string;
  advertiserName: string | null;
};

export type RadarAdBannerPayload = {
  scope: RadarAdScope;
  regionKey: string | null;
  regionLabel: string | null;
  rotationSeconds: number;
  /** KST 오늘 impression 수 — 슬롯 id → 건수 */
  dailyImpressions: Record<string, number>;
  slots: RadarAdSlot[];
};
