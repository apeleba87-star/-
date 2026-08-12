"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { BEFORE_AFTER_FRAME_ASPECT } from "@/lib/knowledge-hub/media/product-before-after-types";

type Props = {
  src: string;
  alt: string;
  focalX: number;
  focalY: number;
  onChange: (x: number, y: number) => void;
  label?: string;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

/**
 * 고정 프레임 안에서 드래그로 사진 위치 조정 (object-fit: cover + object-position)
 */
export default function ImageFocalEditor({ src, alt, focalX, focalY, onChange, label }: Props) {
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      start.current = { x: e.clientX, y: e.clientY, fx: focalX, fy: focalY };
    },
    [focalX, focalY]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!start.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const dx = ((e.clientX - start.current.x) / Math.max(1, rect.width)) * 100;
      const dy = ((e.clientY - start.current.y) / Math.max(1, rect.height)) * 100;
      onChange(clamp(start.current.fx - dx), clamp(start.current.fy - dy));
    },
    [onChange]
  );

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (start.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    start.current = null;
    setDragging(false);
  }, []);

  return (
    <div>
      {label ? <p className="mb-1.5 text-xs font-bold text-slate-600">{label}</p> : null}
      <div
        role="presentation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative touch-none select-none overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ aspectRatio: BEFORE_AFTER_FRAME_ASPECT }}
        title="드래그하여 사진 위치 조정"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
          style={{ objectPosition: `${focalX}% ${focalY}%` }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-2 py-1.5">
          <p className="text-center text-[11px] font-bold text-white">드래그로 위치 조정</p>
        </div>
      </div>
    </div>
  );
}
