"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  appendRadarAdPlacementPreviewParams,
  type RadarAdPlacementPreviewScopeFilter,
} from "@/lib/demand/radar-ad-placement-preview";
import { cn } from "@/lib/utils";

type Filter = "all" | RadarAdPlacementPreviewScopeFilter;

type Props = {
  baseHref: string;
  scrollToY?: number;
  height: number;
  filter: Filter;
  title: string;
};

export default function RadarAdPlacementLivePreview({
  baseHref,
  scrollToY = 0,
  height,
  filter,
  title,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const src = useMemo(
    () => appendRadarAdPlacementPreviewParams(baseHref, filter),
    [baseHref, filter]
  );

  const scrollIframe = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win || scrollToY <= 0) return;
    try {
      win.scrollTo(0, scrollToY);
    } catch {
      // ignore
    }
  }, [scrollToY]);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    if (!loaded) return;
    scrollIframe();
    const t = window.setTimeout(scrollIframe, 400);
    return () => window.clearTimeout(t);
  }, [loaded, scrollIframe]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>실제 화면 미리보기 (모바일)</span>
        <span className="font-mono text-[10px] text-slate-400">390px</span>
      </div>
      <div className="mx-auto w-full max-w-[390px]">
        <div className="overflow-hidden rounded-[1.75rem] border-[6px] border-slate-800 bg-slate-900 shadow-xl ring-1 ring-slate-300/80">
          <div className="h-6 bg-slate-900" aria-hidden />
          <div className="relative bg-white" style={{ height }}>
            {!loaded ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50 text-sm text-slate-500">
                불러오는 중…
              </div>
            ) : null}
            <iframe
              ref={iframeRef}
              key={src}
              src={src}
              title={title}
              className={cn(
                "block w-[390px] border-0 bg-white",
                !loaded && "opacity-0"
              )}
              style={{ height }}
              loading="lazy"
              onLoad={() => setLoaded(true)}
            />
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] leading-relaxed text-slate-500">
        초록·청록 테두리가 직거래 배너 위치입니다. 스크롤해 전체 흐름을 확인할 수 있습니다.
      </p>
    </div>
  );
}
