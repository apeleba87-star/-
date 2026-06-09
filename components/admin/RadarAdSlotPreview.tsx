"use client";

import RadarAdCropEditor from "@/components/admin/RadarAdCropEditor";
import RadarAdSlotCard from "@/components/demand/RadarAdSlotCard";
import {
  normalizeRadarAdImageCrop,
  type RadarAdImageCrop,
} from "@/lib/demand/radar-ad-image-crop";
import { RADAR_AD_IMAGE_SPEC } from "@/lib/demand/radar-ads-shared";
import type { RadarAdSlot, RadarAdSlotCategory } from "@/lib/demand/radar-ads-shared";

type FormLike = {
  slot_index: number;
  category: RadarAdSlotCategory;
  title: string;
  description: string;
  image_url: string | null;
  image_crop_x: number;
  image_crop_y: number;
  image_crop_w: number;
  image_crop_h: number;
  cta_text: string;
  cta_url: string;
  advertiser_name: string;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "초안 (미노출)",
  active: "게재",
  paused: "일시중지",
};

function formCrop(form: FormLike): RadarAdImageCrop {
  return normalizeRadarAdImageCrop({
    x: form.image_crop_x,
    y: form.image_crop_y,
    w: form.image_crop_w,
    h: form.image_crop_h,
  });
}

function formToPreviewSlot(form: FormLike): RadarAdSlot {
  return {
    id: "preview",
    slotIndex: form.slot_index,
    category: form.category,
    title: form.title,
    description: form.description.trim() || null,
    imageUrl: form.image_url,
    imageCrop: formCrop(form),
    ctaText: form.cta_text,
    ctaUrl: form.cta_url || "#",
    advertiserName: form.advertiser_name.trim() || null,
  };
}

export default function RadarAdSlotPreview({
  form,
  badgeLabel,
  onCropChange,
}: {
  form: FormLike;
  badgeLabel: string;
  onCropChange?: (crop: RadarAdImageCrop) => void;
}) {
  const slot = formToPreviewSlot(form);
  const hasImage = Boolean(form.image_url);
  const spec = RADAR_AD_IMAGE_SPEC;
  const crop = formCrop(form);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">노출 미리보기</p>
          <p className="text-xs text-slate-500">입주레이더 허브에 실제로 보이는 형태입니다</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
          {STATUS_LABEL[form.status] ?? form.status}
        </span>
      </div>

      {hasImage ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">
            노출 영역 편집 ({spec.aspectRatio} · 권장 {spec.recommendedWidth}×
            {spec.recommendedHeight}px)
          </p>
          {onCropChange ? (
            <RadarAdCropEditor imageUrl={form.image_url!} crop={crop} onChange={onCropChange} />
          ) : null}
          <p className="text-[10px] text-slate-400">
            점선 안의 영역이 허브에 3:1 와이드 배너로 노출됩니다.
          </p>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          이미지를 올리면 와이드 배너 미리보기가 표시됩니다.
        </p>
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-slate-600">허브 배너 (최종 노출)</p>
        <RadarAdSlotCard slot={slot} badgeLabel={badgeLabel} preview />
      </div>
    </div>
  );
}
