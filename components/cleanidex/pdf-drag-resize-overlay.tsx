"use client";

import { useCallback, useRef } from "react";

const MIN_PX = 24;

export type NormalizedBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Session =
  | {
      kind: "move";
      pointerId: number;
      startClientX: number;
      startClientY: number;
      origLeft: number;
      origTop: number;
      origW: number;
      origH: number;
    }
  | {
      kind: "resize";
      pointerId: number;
      startClientX: number;
      startClientY: number;
      origLeft: number;
      origTop: number;
      origW: number;
      origH: number;
    };

/**
 * react-rnd 대신 포인터 이벤트로 드래그·우하단 리사이즈 (React 19 호환).
 */
export function PdfDragResizeOverlay<T extends NormalizedBox>({
  pw,
  ph,
  norm,
  onNormChange,
  disabled,
  zIndex = 1,
  className,
  children,
  onActivate,
}: {
  pw: number;
  ph: number;
  norm: T;
  onNormChange: (next: T) => void;
  disabled: boolean;
  zIndex?: number;
  className?: string;
  children?: React.ReactNode;
  /** 박스를 눌렀을 때 (선택 UI 등) */
  onActivate?: () => void;
}) {
  const sessionRef = useRef<Session | null>(null);
  const normRef = useRef(norm);
  normRef.current = norm;

  const toNorm = useCallback(
    (leftPx: number, topPx: number, wPx: number, hPx: number): T => {
      const n = normRef.current;
      let w = Math.max(MIN_PX, wPx);
      let h = Math.max(MIN_PX, hPx);
      let x = leftPx / pw;
      let y = topPx / ph;
      x = Math.min(Math.max(0, x), 1 - MIN_PX / pw);
      y = Math.min(Math.max(0, y), 1 - MIN_PX / ph);
      w = Math.min(Math.max(MIN_PX, w), pw - x * pw);
      h = Math.min(Math.max(MIN_PX, h), ph - y * ph);
      return {
        ...n,
        x,
        y,
        width: w / pw,
        height: h / ph,
      };
    },
    [pw, ph]
  );

  const left = norm.x * pw;
  const top = norm.y * ph;
  const width = Math.max(MIN_PX, norm.width * pw);
  const height = Math.max(MIN_PX, norm.height * ph);

  function startMove(e: React.PointerEvent) {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    sessionRef.current = {
      kind: "move",
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origLeft: left,
      origTop: top,
      origW: width,
      origH: height,
    };
    const onMove = (ev: PointerEvent) => {
      const s = sessionRef.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      const dx = ev.clientX - s.startClientX;
      const dy = ev.clientY - s.startClientY;
      let nl = s.origLeft + dx;
      let nt = s.origTop + dy;
      nl = Math.min(Math.max(0, nl), pw - s.origW);
      nt = Math.min(Math.max(0, nt), ph - s.origH);
      onNormChange(toNorm(nl, nt, s.origW, s.origH));
    };
    const onUp = (ev: PointerEvent) => {
      const s = sessionRef.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      sessionRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function startResize(e: React.PointerEvent) {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    sessionRef.current = {
      kind: "resize",
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origLeft: left,
      origTop: top,
      origW: width,
      origH: height,
    };
    const onMove = (ev: PointerEvent) => {
      const s = sessionRef.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      const dx = ev.clientX - s.startClientX;
      const dy = ev.clientY - s.startClientY;
      let nw = Math.max(MIN_PX, s.origW + dx);
      let nh = Math.max(MIN_PX, s.origH + dy);
      nw = Math.min(nw, pw - s.origLeft);
      nh = Math.min(nh, ph - s.origTop);
      onNormChange(toNorm(s.origLeft, s.origTop, nw, nh));
    };
    const onUp = (ev: PointerEvent) => {
      const s = sessionRef.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      sessionRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <div
      className={`pointer-events-auto absolute overflow-hidden rounded-md border-2 border-dashed shadow-sm ${className ?? ""}`}
      style={{
        left,
        top,
        width,
        height,
        zIndex,
        touchAction: "none",
      }}
      onPointerDown={() => {
        if (!disabled) onActivate?.();
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onPointerDown={startMove}
        className="flex h-[calc(100%-14px)] w-full cursor-move items-start justify-center bg-white/30 p-1 text-left disabled:cursor-not-allowed"
      >
        <span className="pointer-events-none w-full select-none">{children}</span>
      </button>
      <div
        role="presentation"
        onPointerDown={disabled ? undefined : startResize}
        className={`absolute bottom-0 right-0 h-4 w-4 rounded-br-md border-l border-t border-slate-600/40 bg-white/80 ${
          disabled ? "pointer-events-none opacity-40" : "cursor-se-resize"
        }`}
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
