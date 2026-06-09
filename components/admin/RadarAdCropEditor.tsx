"use client";

import { useCallback, useRef, useState } from "react";
import {
  DEFAULT_RADAR_AD_IMAGE_CROP,
  normalizeRadarAdImageCrop,
  RADAR_AD_CROP_MIN_SIZE,
  type RadarAdImageCrop,
} from "@/lib/demand/radar-ad-image-crop";
import { cn } from "@/lib/utils";

type Props = {
  imageUrl: string;
  crop: RadarAdImageCrop;
  onChange: (crop: RadarAdImageCrop) => void;
};

type DragMode = "move" | "resize-se" | null;

function pct(n: number): string {
  return `${n * 100}%`;
}

export default function RadarAdCropEditor({ imageUrl, crop, onChange }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startCrop: RadarAdImageCrop;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const safe = normalizeRadarAdImageCrop(crop);

  const onPointerDown = useCallback(
    (mode: DragMode, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startCrop: safe,
      };
      setDragging(true);
    },
    [safe]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      const frame = frameRef.current;
      if (!drag || !frame) return;

      const rect = frame.getBoundingClientRect();
      const dx = (e.clientX - drag.startX) / rect.width;
      const dy = (e.clientY - drag.startY) / rect.height;
      const start = drag.startCrop;

      if (drag.mode === "move") {
        onChange(
          normalizeRadarAdImageCrop({
            x: start.x + dx,
            y: start.y + dy,
            w: start.w,
            h: start.h,
          })
        );
        return;
      }

      if (drag.mode === "resize-se") {
        onChange(
          normalizeRadarAdImageCrop({
            x: start.x,
            y: start.y,
            w: start.w + dx,
            h: start.h + dy,
          })
        );
      }
    },
    [onChange]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-600">
          점선 안전 영역을 드래그해 이동 · 우하 모서리로 크기 조절
        </p>
        <button
          type="button"
          className="text-xs text-teal-700 hover:underline"
          onClick={() => onChange({ ...DEFAULT_RADAR_AD_IMAGE_CROP })}
        >
          기본(80%)으로 초기화
        </button>
      </div>
      <div
        ref={frameRef}
        className={cn(
          "relative aspect-[3/1] w-full select-none overflow-hidden rounded-lg border border-slate-200 bg-slate-900/5",
          dragging && "cursor-grabbing"
        )}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />

        <div
          className="pointer-events-none absolute bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.5)]"
          style={{
            left: pct(safe.x),
            top: pct(safe.y),
            width: pct(safe.w),
            height: pct(safe.h),
          }}
          aria-hidden
        />

        {/* 안전 영역 — 드래그 */}
        <div
          className="absolute cursor-grab border-2 border-dashed border-amber-400 bg-amber-400/10 active:cursor-grabbing"
          style={{
            left: pct(safe.x),
            top: pct(safe.y),
            width: pct(safe.w),
            height: pct(safe.h),
          }}
          onPointerDown={(e) => onPointerDown("move", e)}
          role="slider"
          aria-label="광고 노출 안전 영역"
        >
          <span className="absolute left-1 top-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
            노출 영역
          </span>
          <div
            className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize rounded-tl bg-amber-500"
            onPointerDown={(e) => onPointerDown("resize-se", e)}
            aria-label="크기 조절"
          />
        </div>
      </div>
      <p className="text-[10px] text-slate-400">
        안전 영역 밖은 배너에서 잘립니다. 최소 {RADAR_AD_CROP_MIN_SIZE * 100}% 크기.
      </p>
    </div>
  );
}
