/** 입주레이더 광고 이미지 노출 영역 — 원본 대비 정규화(0~1) */

export type RadarAdImageCrop = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export const DEFAULT_RADAR_AD_IMAGE_CROP: RadarAdImageCrop = {
  x: 0.1,
  y: 0.1,
  w: 0.8,
  h: 0.8,
};

export const RADAR_AD_CROP_MIN_SIZE = 0.15;

export function normalizeRadarAdImageCrop(
  raw: Partial<RadarAdImageCrop> | null | undefined
): RadarAdImageCrop {
  if (!raw) return { ...DEFAULT_RADAR_AD_IMAGE_CROP };
  const w = clamp(raw.w ?? DEFAULT_RADAR_AD_IMAGE_CROP.w, RADAR_AD_CROP_MIN_SIZE, 1);
  const h = clamp(raw.h ?? DEFAULT_RADAR_AD_IMAGE_CROP.h, RADAR_AD_CROP_MIN_SIZE, 1);
  const x = clamp(raw.x ?? DEFAULT_RADAR_AD_IMAGE_CROP.x, 0, 1 - w);
  const y = clamp(raw.y ?? DEFAULT_RADAR_AD_IMAGE_CROP.y, 0, 1 - h);
  return { x, y, w, h };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** overflow:hidden 컨테이너 안에서 크롭 영역만 채우기 */
export function radarAdCropImageStyle(crop: RadarAdImageCrop): Record<string, string> {
  const { x, y, w, h } = normalizeRadarAdImageCrop(crop);
  return {
    position: "absolute",
    width: `${(1 / w) * 100}%`,
    height: `${(1 / h) * 100}%`,
    left: `${(-x / w) * 100}%`,
    top: `${(-y / h) * 100}%`,
    maxWidth: "none",
  };
}

export function cropFromRow(row: {
  image_crop_x?: number | null;
  image_crop_y?: number | null;
  image_crop_w?: number | null;
  image_crop_h?: number | null;
}): RadarAdImageCrop {
  return normalizeRadarAdImageCrop({
    x: row.image_crop_x ?? undefined,
    y: row.image_crop_y ?? undefined,
    w: row.image_crop_w ?? undefined,
    h: row.image_crop_h ?? undefined,
  });
}
