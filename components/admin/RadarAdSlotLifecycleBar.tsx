"use client";

import type { RadarAdSlotInput } from "@/app/admin/radar-ads/actions";
import {
  getRadarSlotLifecyclePhase,
  RADAR_SLOT_LIFECYCLE_CLASS,
  RADAR_SLOT_LIFECYCLE_HINTS,
  RADAR_SLOT_LIFECYCLE_LABELS,
} from "@/lib/demand/radar-ad-slot-lifecycle";
import { cn } from "@/lib/utils";

type Props = {
  form: RadarAdSlotInput;
  today: string;
  disabled?: boolean;
  onApply: (patch: Partial<RadarAdSlotInput>) => void;
};

export function RadarAdLifecycleNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700",
        className
      )}
    >
      <p className="font-medium text-slate-900">종료·중지 시 삭제하지 마세요</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        계약 종료·중간 해지는 <strong>중지(paused)</strong> 또는 <strong>초안(draft)</strong>으로 보관합니다.
        노출·클릭 성과는 슬롯에 연결되어 있어 삭제하면 기록이 사라집니다. 지역 직거래가 없으면 제휴 대체 광고가
        노출됩니다.
      </p>
    </div>
  );
}

export default function RadarAdSlotLifecycleBar({ form, today, disabled, onApply }: Props) {
  const phase = getRadarSlotLifecyclePhase(
    {
      status: form.status,
      start_date: form.start_date,
      end_date: form.end_date,
    },
    today
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
              RADAR_SLOT_LIFECYCLE_CLASS[phase]
            )}
          >
            {RADAR_SLOT_LIFECYCLE_LABELS[phase]}
          </span>
          <p className="mt-2 text-xs text-slate-600">{RADAR_SLOT_LIFECYCLE_HINTS[phase]}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {form.start_date} ~ {form.end_date}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.status === "active" ? (
            <button
              type="button"
              disabled={disabled}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              onClick={() => onApply({ status: "paused" })}
            >
              중지
            </button>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() =>
              onApply({
                status: "paused",
                end_date: form.end_date < today ? form.end_date : today,
              })
            }
          >
            종료 보관
          </button>
          <button
            type="button"
            disabled={disabled}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => onApply({ status: "draft" })}
          >
            초안 보관
          </button>
          {form.status !== "active" ? (
            <button
              type="button"
              disabled={disabled}
              className="rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              onClick={() => onApply({ status: "active" })}
            >
              다시 게재
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
