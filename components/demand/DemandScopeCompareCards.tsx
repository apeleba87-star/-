"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import DemandHeatBadge from "@/components/demand/DemandHeatBadge";
import { DemandSearchIndexCell, DemandSearchVolumeCell } from "@/components/demand/DemandSearchMetricCell";
import DemandTradeMetricCell from "@/components/demand/DemandTradeMetricCell";
import { DEMAND_METRIC_LABELS } from "@/lib/demand/copy";
import { formatDemandScoreBasis } from "@/lib/demand/district-demand-score";
import { demandMetricChartTheme } from "@/lib/demand/metric-chart-theme";
import type { DemandMetricId } from "@/lib/demand/metrics";
import { demandRegionSelectionKey } from "@/lib/demand/regions";
import type { DemandScopeTableRow } from "@/lib/demand/scope-data";
import { cn } from "@/lib/utils";

type Props = {
  rows: DemandScopeTableRow[];
  focusRowKey: string | null;
  selectedMetric: DemandMetricId | null;
  onFocusRow: (key: string) => void;
  onSelectMetric: (row: DemandScopeTableRow, metricId: DemandMetricId) => void;
  rtmsBaseMonthLabel?: string | null;
};

type MetricRow = {
  id: DemandMetricId;
  label: string;
  render: (row: DemandScopeTableRow) => ReactNode;
};

const METRIC_ROWS: MetricRow[] = [
  {
    id: "demandScore",
    label: DEMAND_METRIC_LABELS.demandScore,
    render: (row) => (
      <div>
        <DemandHeatBadge band={row.demandScore.band} score={row.demandScore.score} compact />
        <p className="mt-0.5 text-[10px] text-slate-400">
          {formatDemandScoreBasis(row.demandScore.basis)}
        </p>
      </div>
    ),
  },
  {
    id: "jeonse",
    label: DEMAND_METRIC_LABELS.jeonse,
    render: (row) => <DemandTradeMetricCell count={row.jeonseCount} momPercent={row.jeonseMom} />,
  },
  {
    id: "sale",
    label: DEMAND_METRIC_LABELS.sale,
    render: (row) => <DemandTradeMetricCell count={row.saleCount} momPercent={row.saleMom} />,
  },
  {
    id: "packingIndex",
    label: DEMAND_METRIC_LABELS.packingIndex,
    render: (row) => <DemandSearchIndexCell metric={row.packing} />,
  },
  {
    id: "moveInIndex",
    label: DEMAND_METRIC_LABELS.moveInIndex,
    render: (row) => <DemandSearchIndexCell metric={row.moveInClean} />,
  },
];

function CompareStrip({
  rows,
  focusRowKey,
  onFocusRow,
}: {
  rows: DemandScopeTableRow[];
  focusRowKey: string | null;
  onFocusRow: (key: string) => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        rows.length === 2 ? "grid-cols-2" : rows.length >= 3 ? "grid-cols-3" : "grid-cols-1"
      )}
    >
      {rows.map((row) => {
        const key = demandRegionSelectionKey(row.selection);
        const active = focusRowKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onFocusRow(key)}
            className={cn(
              "min-h-[88px] rounded-xl border px-3 py-2.5 text-left transition-colors",
              active
                ? "border-teal-300 bg-teal-50/80 ring-1 ring-teal-100"
                : "border-slate-200 bg-white"
            )}
            aria-pressed={active}
          >
            <p className="truncate text-sm font-bold text-slate-900">{row.label}</p>
            <div className="mt-1.5">
              <DemandHeatBadge band={row.demandScore.band} score={row.demandScore.score} compact />
            </div>
            <p className="mt-1 text-[10px] tabular-nums text-slate-500">
              전월세 {row.jeonseCount.toLocaleString("ko-KR")}건
            </p>
          </button>
        );
      })}
    </div>
  );
}

function MetricButton({
  metricId,
  label,
  active,
  onClick,
  children,
}: {
  metricId: DemandMetricId;
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const theme = demandMetricChartTheme(metricId);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        active ? theme.cardSelected : "border-slate-200 bg-white"
      )}
      aria-pressed={active}
    >
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className="shrink-0 text-right">{children}</span>
    </button>
  );
}

export default function DemandScopeCompareCards({
  rows,
  focusRowKey,
  selectedMetric,
  onFocusRow,
  onSelectMetric,
  rtmsBaseMonthLabel,
}: Props) {
  const focusRow =
    rows.find((r) => demandRegionSelectionKey(r.selection) === focusRowKey) ?? rows[0];

  if (!focusRow) return null;

  const focusKey = demandRegionSelectionKey(focusRow.selection);

  return (
    <div className="space-y-3 md:hidden">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">
          {rows.length > 1 ? "지역 비교" : "지표 상세"}
        </p>
        <p className="text-[10px] text-slate-400">탭 → 그래프</p>
      </div>

      {rows.length > 1 ? (
        <CompareStrip rows={rows} focusRowKey={focusRowKey} onFocusRow={onFocusRow} />
      ) : null}

      <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="border-b border-slate-100 pb-2">
          {focusRow.hasDetail && focusRow.slug ? (
            <Link href={`/demand/region/${focusRow.slug}`} className="font-bold text-teal-800">
              {focusRow.label}
            </Link>
          ) : (
            <p className="font-bold text-slate-900">{focusRow.label}</p>
          )}
        </div>

        <div className="mt-2 space-y-1.5">
          {METRIC_ROWS.map(({ id, label, render }) => (
            <MetricButton
              key={id}
              metricId={id}
              label={label}
              active={focusRowKey === focusKey && selectedMetric === id}
              onClick={() => onSelectMetric(focusRow, id)}
            >
              {render(focusRow)}
            </MetricButton>
          ))}
        </div>
      </article>

      {rtmsBaseMonthLabel ? (
        <p className="text-[10px] text-slate-400">
          {rtmsBaseMonthLabel} · 거래=RTMS · 검색=전국 이사·입주 관련
        </p>
      ) : null}
    </div>
  );
}
