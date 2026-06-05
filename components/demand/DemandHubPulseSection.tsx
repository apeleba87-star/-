"use client";

import DemandPulseMiniSparkline from "@/components/demand/DemandPulseMiniSparkline";
import {
  DEMAND_METRIC_LABELS,
  DEMAND_NATIONAL_INTEREST_LABEL,
  DEMAND_PULSE_CADENCE_DAILY,
  DEMAND_PULSE_CADENCE_MONTHLY,
  formatSearchIndexPercent,
  formatSearchVolumeMonth,
} from "@/lib/demand/copy";import type { DailyPulseData } from "@/lib/demand/daily-pulse";
import type { DemandKeywordChartPoint } from "@/lib/demand/keyword-hub-data";
import { cn } from "@/lib/utils";

type Props = {
  data: DailyPulseData;
  /** 모바일에서만 패딩·글자·스파크라인 축소 (md+는 기존 크기) */
  compactOnMobile?: boolean;
};

function lastLevel(points: DemandKeywordChartPoint[]): number | null {
  const v = points.at(-1)?.value;
  return v != null && Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
}

function seriesDeltaPct(points: DemandKeywordChartPoint[]): number | null {
  if (points.length < 2) return null;
  const prev = points[points.length - 2].value;
  const last = points[points.length - 1].value;
  if (!Number.isFinite(prev) || !Number.isFinite(last) || prev <= 0) return null;
  return Math.round(((last - prev) / prev) * 1000) / 10;
}

function deltaTone(delta: number | null): "up" | "down" | "flat" {
  if (delta == null || Math.abs(delta) < 0.05) return "flat";
  return delta > 0 ? "up" : "down";
}

function cardBorderClass(delta: number | null): string {
  if (delta == null || Math.abs(delta) < 10) return "border-slate-200";
  const tone = deltaTone(delta);
  if (tone === "up") return "border-emerald-200 ring-1 ring-emerald-50";
  if (tone === "down") return "border-rose-200 ring-1 ring-rose-50";
  return "border-slate-200";
}

function DeltaBadge({
  delta,
  compactOnMobile,
}: {
  delta: number | null;
  compactOnMobile?: boolean;
}) {
  const tone = deltaTone(delta);
  if (tone === "flat" || delta == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-slate-100 font-semibold text-slate-600",
          compactOnMobile
            ? "px-1.5 py-px text-[9px] md:px-2 md:py-0.5 md:text-[10px]"
            : "px-2 py-0.5 text-[10px]"
        )}
      >
        {compactOnMobile ? (
          <>
            <span className="md:hidden">비슷</span>
            <span className="hidden md:inline">어제와 비슷</span>
          </>
        ) : (
          "어제와 비슷"
        )}
      </span>
    );
  }
  const arrow = tone === "up" ? "▲" : "▼";
  const label = formatSearchIndexPercent(delta);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full font-semibold tabular-nums",
        compactOnMobile
          ? "px-1.5 py-px text-[9px] md:px-2 md:py-0.5 md:text-[10px]"
          : "px-2 py-0.5 text-[10px]",
        tone === "up" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
      )}
    >
      {compactOnMobile ? (
        <>
          <span className="md:hidden">
            {arrow} {label}
          </span>
          <span className="hidden md:inline">
            어제보다 {arrow} {label}
          </span>
        </>
      ) : (
        <>어제보다 {arrow} {label}</>
      )}
    </span>
  );
}

function CompositeBaselineBar({
  value,
  compactOnMobile,
}: {
  value: number;
  compactOnMobile?: boolean;
}) {
  const min = 85;
  const max = 115;
  const clamped = Math.min(max, Math.max(min, value));
  const posPct = ((clamped - min) / (max - min)) * 100;
  const basePct = ((100 - min) / (max - min)) * 100;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-slate-100",
        compactOnMobile ? "mt-1 h-1.5 md:mt-2 md:h-2" : "mt-2 h-2"
      )}
    >
      <div
        className="absolute top-0 h-full w-0.5 bg-slate-400"
        style={{ left: `${basePct}%` }}
        aria-hidden
      />
      <div
        className={cn(
          "absolute top-0 -translate-x-1/2 rounded-full bg-teal-600",
          compactOnMobile ? "h-full w-1.5 md:w-2" : "h-full w-2"
        )}
        style={{ left: `${posPct}%` }}
        aria-hidden
      />
    </div>
  );
}

function IndexPulseCard({
  label,
  level,
  delta,
  sparkPoints,
  strokeClass,
  fillClass,
  compactOnMobile,
}: {
  label: string;
  level: number | null;
  delta: number | null;
  sparkPoints: DemandKeywordChartPoint[];
  strokeClass: string;
  fillClass: string;
  compactOnMobile?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-lg border bg-white shadow-sm md:rounded-xl",
        compactOnMobile ? "p-2 md:p-3" : "p-3",
        cardBorderClass(delta)
      )}
    >
      <p
        className={cn(
          "font-medium leading-tight text-slate-500",
          compactOnMobile ? "text-[9px] md:text-[11px]" : "text-[11px]"
        )}
      >
        {label}
      </p>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <p
          className={cn(
            "font-black tabular-nums text-slate-900",
            compactOnMobile ? "text-base md:text-2xl" : "text-2xl"
          )}
        >
          {level != null ? level.toLocaleString("ko-KR") : "—"}
        </p>
        {delta != null ? (
          <p
            className={cn(
              "font-bold tabular-nums",
              compactOnMobile ? "text-[10px] md:text-sm" : "text-sm",
              deltaTone(delta) === "up"
                ? "text-emerald-600"
                : deltaTone(delta) === "down"
                  ? "text-rose-600"
                  : "text-slate-500"
            )}
          >
            {formatSearchIndexPercent(delta)}
          </p>
        ) : null}
      </div>
      <div className={compactOnMobile ? "mt-1 md:mt-2" : "mt-2"}>
        <DemandPulseMiniSparkline
          points={sparkPoints}
          strokeClass={strokeClass}
          fillClass={fillClass}
          className={compactOnMobile ? "h-5 w-full md:h-9" : undefined}
        />
      </div>
      <div className={compactOnMobile ? "mt-0.5 md:mt-1.5" : "mt-1.5"}>
        <DeltaBadge delta={delta} compactOnMobile={compactOnMobile} />
      </div>
      <p
        className={cn(
          "text-slate-400",
          compactOnMobile
            ? "mt-0.5 hidden text-[9px] md:mt-1 md:block md:text-[10px]"
            : "mt-1 text-[10px]"
        )}
      >
        최근 7일
      </p>
    </article>
  );
}

function PulseCadenceLabel({ cadence }: { cadence: "monthly" | "daily" }) {
  const monthly = cadence === "monthly";
  return (
    <p
      className={cn(
        "text-[10px] font-bold tracking-wide md:text-xs",
        monthly ? "text-teal-700" : "text-slate-500"
      )}
    >
      {monthly ? DEMAND_PULSE_CADENCE_MONTHLY : DEMAND_PULSE_CADENCE_DAILY}
    </p>
  );
}

function CompositePulseCard({
  data,
  compactOnMobile,
}: {
  data: DailyPulseData;
  compactOnMobile?: boolean;
}) {
  const compositeDelta = data.nationalChangePct;
  const compositeTone = deltaTone(compositeDelta);

  return (
    <article
      className={cn(
        "rounded-lg border border-teal-100 bg-gradient-to-br from-teal-50/60 to-white shadow-sm ring-1 ring-teal-50 md:rounded-xl",
        compactOnMobile ? "p-2 md:p-3" : "p-3",
        compositeTone === "up" && "ring-emerald-100",
        compositeTone === "down" && "ring-rose-100"
      )}
    >
      <p
        className={cn(
          "font-semibold leading-tight text-teal-800",
          compactOnMobile ? "text-[10px] md:text-[11px]" : "text-[11px]"
        )}
      >
        {DEMAND_NATIONAL_INTEREST_LABEL}
      </p>
      <p
        className={cn(
          "font-black tabular-nums text-teal-900",
          compactOnMobile ? "mt-0.5 text-xl md:text-3xl" : "mt-0.5 text-3xl"
        )}
      >
        {Math.round(data.nationalComposite * 10) / 10}
      </p>
      <p
        className={cn(
          "font-bold tabular-nums",
          compactOnMobile ? "text-[10px] md:text-sm" : "text-sm",
          compositeTone === "up"
            ? "text-emerald-600"
            : compositeTone === "down"
              ? "text-rose-600"
              : "text-slate-600"
        )}
      >
        100선 {formatSearchIndexPercent(compositeDelta)}
      </p>
      <CompositeBaselineBar value={data.nationalComposite} compactOnMobile={compactOnMobile} />
      <p
        className={cn(
          "leading-snug text-slate-500",
          compactOnMobile
            ? "mt-1 text-[9px] md:mt-2 md:text-[10px] md:leading-relaxed"
            : "mt-2 text-[10px] leading-relaxed"
        )}
      >
        {data.basisLabel}
      </p>
    </article>
  );
}

function RollingPulseCard({
  data,
  packingRoll,
  moveInRoll,
  compactOnMobile,
}: {
  data: DailyPulseData;
  packingRoll: DemandKeywordChartPoint[];
  moveInRoll: DemandKeywordChartPoint[];
  compactOnMobile?: boolean;
}) {
  return (
    <article
      className={cn(
        "h-full rounded-lg border border-slate-200 bg-white shadow-sm md:rounded-xl",
        compactOnMobile ? "p-2 md:p-2.5" : "p-2.5"
      )}
    >
      <p className="text-[10px] font-medium text-slate-500 md:text-[11px]">롤링 30일 검색량</p>
      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1.5 border-t border-slate-100 pt-1.5">
        <RollingRowCompact
          label="포장"
          volume={data.packingRollingVolume}
          belowTen={data.packingRollingBelowTen}
          sparkPoints={packingRoll}
        />
        <RollingRowCompact
          label="입주청소"
          volume={data.moveInRollingVolume}
          belowTen={data.moveInRollingBelowTen}
          sparkPoints={moveInRoll}
        />
      </div>
    </article>
  );
}

function RollingRowCompact({
  label,
  volume,
  belowTen,
  sparkPoints,
}: {
  label: string;
  volume: number | null;
  belowTen: boolean;
  sparkPoints: DemandKeywordChartPoint[];
}) {
  const delta = seriesDeltaPct(sparkPoints);
  const volLabel = belowTen ? "<10" : volume != null ? formatSearchVolumeMonth(volume) : "—";
  const tone = deltaTone(delta);

  return (
    <div className="min-w-0">
      <p className="truncate text-[9px] font-medium text-slate-500 md:text-[10px]">{label}</p>
      <p className="mt-0.5 text-sm font-black tabular-nums leading-none text-slate-900 md:text-base">
        {volLabel}
      </p>
      {delta != null ? (
        <p
          className={cn(
            "mt-0.5 text-[9px] font-semibold tabular-nums md:text-[10px]",
            tone === "up" ? "text-emerald-600" : tone === "down" ? "text-rose-600" : "text-slate-400"
          )}
        >
          {tone === "flat" ? "비슷" : formatSearchIndexPercent(delta)}
        </p>
      ) : null}
    </div>
  );
}

export default function DemandHubPulseSection({ data, compactOnMobile = false }: Props) {
  const packingSpark =
    data.indexSparklines.find((s) => s.tone === "packing")?.points ?? [];
  const moveInSpark =
    data.indexSparklines.find((s) => s.tone === "moveIn")?.points ?? [];
  const packingRoll =
    data.rollingSparklines.find((s) => s.tone === "packing")?.points ?? [];
  const moveInRoll =
    data.rollingSparklines.find((s) => s.tone === "moveIn")?.points ?? [];

  return (
    <section className="grid grid-cols-2 gap-x-1.5 gap-y-2 md:gap-x-2 xl:grid-cols-4">
      <div className="col-span-2 space-y-1 xl:col-span-1">
        <PulseCadenceLabel cadence="monthly" />
        <CompositePulseCard data={data} compactOnMobile={compactOnMobile} />
      </div>

      <div className="col-span-2 space-y-1 xl:col-span-3">
        <PulseCadenceLabel cadence="daily" />
        <div className="grid grid-cols-2 gap-1.5 md:gap-2 xl:grid-cols-3">
          <IndexPulseCard
            label={DEMAND_METRIC_LABELS.packingIndex}
            level={lastLevel(packingSpark)}
            delta={data.packingIndexDod}
            sparkPoints={packingSpark}
            strokeClass="stroke-sky-600"
            fillClass="fill-sky-500"
            compactOnMobile={compactOnMobile}
          />
          <IndexPulseCard
            label={DEMAND_METRIC_LABELS.moveInIndex}
            level={lastLevel(moveInSpark)}
            delta={data.moveInIndexDod}
            sparkPoints={moveInSpark}
            strokeClass="stroke-teal-600"
            fillClass="fill-teal-500"
            compactOnMobile={compactOnMobile}
          />
          <RollingPulseCard
            data={data}
            packingRoll={packingRoll}
            moveInRoll={moveInRoll}
            compactOnMobile={compactOnMobile}
          />
        </div>
      </div>
    </section>
  );
}
