"use client";

import { useEffect, useState } from "react";
import {
  buildRadarAdCtaUrl,
  formatPhoneInputDisplay,
  radarAdCtaModeFromUrl,
  radarAdLinkValueFromUrl,
  radarAdPhoneDigitsFromUrl,
  type RadarAdCtaMode,
} from "@/lib/demand/radar-ads-cta";
import { cn } from "@/lib/utils";

type Props = {
  ctaUrl: string;
  onChange: (url: string) => void;
  slotKey: string;
};

export default function RadarAdCtaField({ ctaUrl, onChange, slotKey }: Props) {
  const [mode, setMode] = useState<RadarAdCtaMode>(() => radarAdCtaModeFromUrl(ctaUrl));
  const [linkValue, setLinkValue] = useState(() => radarAdLinkValueFromUrl(ctaUrl));
  const [phoneDigits, setPhoneDigits] = useState(() => radarAdPhoneDigitsFromUrl(ctaUrl));

  useEffect(() => {
    setMode(radarAdCtaModeFromUrl(ctaUrl));
    setLinkValue(radarAdLinkValueFromUrl(ctaUrl));
    setPhoneDigits(radarAdPhoneDigitsFromUrl(ctaUrl));
  }, [slotKey]);

  function switchMode(next: RadarAdCtaMode) {
    setMode(next);
    if (next === "phone") {
      const digits = phoneDigits || radarAdPhoneDigitsFromUrl(ctaUrl);
      onChange(buildRadarAdCtaUrl("phone", digits));
    } else {
      const link = linkValue || radarAdLinkValueFromUrl(ctaUrl);
      onChange(buildRadarAdCtaUrl("link", link));
    }
  }

  return (
    <div className="sm:col-span-2">
      <span className="font-medium text-slate-700">연결 *</span>
      <div className="mt-2 flex gap-1">
        {(
          [
            { id: "link" as const, label: "링크" },
            { id: "phone" as const, label: "전화번호" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchMode(tab.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              mode === tab.id
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {mode === "link" ? (
        <input
          className="input mt-2 w-full text-sm"
          placeholder="https://example.com"
          value={linkValue}
          onChange={(e) => {
            const next = e.target.value;
            setLinkValue(next);
            onChange(buildRadarAdCtaUrl("link", next));
          }}
          required
        />
      ) : (
        <div className="mt-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
            <span className="flex items-center bg-slate-50 px-3 text-sm text-slate-500">tel:</span>
            <input
              className="min-h-10 flex-1 border-0 px-3 text-sm focus:outline-none focus:ring-0"
              placeholder="010-1234-5678"
              inputMode="tel"
              value={formatPhoneInputDisplay(phoneDigits)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                setPhoneDigits(digits);
                onChange(buildRadarAdCtaUrl("phone", digits));
              }}
              required
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">숫자만 입력 · 탭 시 전화 연결</p>
        </div>
      )}
    </div>
  );
}
