"use client";

import { useRef } from "react";

import { MagamChoiceChip } from "@/components/magam/ui/MagamUi";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function localDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayIso(): string {
  return localDateIso(new Date());
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDateIso(d);
}

export function formatMagamScheduleDateLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

type Props = {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  showTodayTomorrow?: boolean;
};

export default function MagamScheduleDateField({
  value,
  onChange,
  disabled,
  showTodayTomorrow = true,
}: Props) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const today = todayIso();
  const tomorrow = tomorrowIso();

  function openPicker() {
    const el = dateInputRef.current;
    if (!el || disabled) return;
    el.showPicker?.();
    el.click();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {showTodayTomorrow ? (
          <>
            <MagamChoiceChip
              selected={value === today}
              disabled={disabled}
              onClick={() => onChange(value === today ? "" : today)}
            >
              오늘
            </MagamChoiceChip>
            <MagamChoiceChip
              selected={value === tomorrow}
              disabled={disabled}
              onClick={() => onChange(value === tomorrow ? "" : tomorrow)}
            >
              내일
            </MagamChoiceChip>
          </>
        ) : null}
        <MagamChoiceChip selected={false} disabled={disabled} onClick={openPicker}>
          날짜 선택
        </MagamChoiceChip>
        <input
          ref={dateInputRef}
          type="date"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          value={value}
          min={today}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      {value ? (
        <div className="mt-3 flex items-center gap-2 rounded-[14px] border border-[#D6E4FF] bg-[#EEF3FF] px-3 py-2.5">
          <span className="text-[#2563EB]" aria-hidden>
            📅
          </span>
          <span className="flex-1 text-[15px] font-semibold text-[#141824]">
            {formatMagamScheduleDateLabel(value)}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            className="rounded p-1 text-[#5B6472] hover:bg-white/60"
            aria-label="일정 지우기"
          >
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}
