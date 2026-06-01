"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import DemandMetricCell from "@/components/demand/DemandMetricCell";
import DemandRegionPicker from "@/components/demand/DemandRegionPicker";
import DemandTradeMetricCell from "@/components/demand/DemandTradeMetricCell";
import { DEMAND_NATIONAL_KEYWORD_LABELS } from "@/lib/demand/copy";
import { DEMAND_SNAPSHOT_META } from "@/lib/demand/dummy-data";
import {
  DEMAND_MAX_REGION_COMPARE,
  demandRegionSelectionKey,
  getDemandDistrictRef,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import {
  DEMAND_TABLE_ROWS,
  type DemandDistrictTableRow,
  type DemandTableSortKey,
} from "@/lib/demand/table-data";
import { cn } from "@/lib/utils";

type SortDir = "asc" | "desc";

const COLUMNS: {
  key: DemandTableSortKey;
  label: string;
  short: string;
  align: "left" | "right";
}[] = [
  { key: "gu", label: "지역", short: "지역", align: "left" },
  { key: "packing", label: DEMAND_NATIONAL_KEYWORD_LABELS.packing, short: "포장이사", align: "right" },
  { key: "jeonse", label: "전월세 거래량", short: "전월세", align: "right" },
  { key: "sale", label: "매매 거래량", short: "매매", align: "right" },
  {
    key: "moveInClean",
    label: DEMAND_NATIONAL_KEYWORD_LABELS.moveInClean,
    short: "입주청소",
    align: "right",
  },
  { key: "index", label: "입주수요지수", short: "지수", align: "right" },
];

function rowForSelection(sel: DemandRegionSelection): DemandDistrictTableRow | null {
  const ref = getDemandDistrictRef(sel.cityId, sel.guSlug);
  if (!ref) return null;
  return DEMAND_TABLE_ROWS.find((r) => r.slug === ref.slug) ?? null;
}

function rowsForSelections(selections: DemandRegionSelection[]): DemandDistrictTableRow[] {
  return selections
    .map(rowForSelection)
    .filter((r): r is DemandDistrictTableRow => r != null);
}

function sortRows(
  rows: DemandDistrictTableRow[],
  key: DemandTableSortKey,
  dir: SortDir
): DemandDistrictTableRow[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "gu") return mul * a.gu.localeCompare(b.gu, "ko");
    const pick = (r: DemandDistrictTableRow): number => {
      switch (key) {
        case "packing":
          return r.packingMom;
        case "jeonse":
          return r.jeonseCount;
        case "sale":
          return r.saleCount;
        case "moveInClean":
          return r.moveInCleanMom;
        case "index":
          return r.indexScore ?? -1;
        default:
          return 0;
      }
    };
    return mul * (pick(a) - pick(b));
  });
}

function compareHref(slugs: string[]): string | null {
  if (slugs.length < 2) return null;
  const q = slugs
    .slice(0, DEMAND_MAX_REGION_COMPARE)
    .map((slug, i) => `gu${i + 1}=${encodeURIComponent(slug)}`)
    .join("&");
  return `/demand/compare?${q}`;
}

export default function DemandRegionTable() {
  const [selections, setSelections] = useState<DemandRegionSelection[]>([]);
  const [sortKey, setSortKey] = useState<DemandTableSortKey>("index");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const hasSelection = selections.length > 0;

  const visibleRows = useMemo(() => {
    const rows = rowsForSelections(selections);
    return sortRows(rows, sortKey, sortDir);
  }, [selections, sortKey, sortDir]);

  function onAdd(sel: DemandRegionSelection) {
    const key = demandRegionSelectionKey(sel);
    setSelections((prev) => {
      if (prev.some((s) => demandRegionSelectionKey(s) === key)) return prev;
      if (prev.length >= DEMAND_MAX_REGION_COMPARE) return prev;
      return [...prev, sel];
    });
  }

  function onRemove(key: string) {
    setSelections((prev) => prev.filter((s) => demandRegionSelectionKey(s) !== key));
  }

  function onSort(key: DemandTableSortKey) {
    if (!hasSelection) return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "gu" ? "asc" : "desc");
    }
  }

  function SortIcon({ col }: { col: DemandTableSortKey }) {
    if (!hasSelection || sortKey !== col) {
      return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3.5 w-3.5 text-teal-700" />
    ) : (
      <ArrowDown className="ml-1 inline h-3.5 w-3.5 text-teal-700" />
    );
  }

  const slugs = visibleRows.map((r) => r.slug);
  const compareLink = compareHref(slugs);

  return (
    <div className="space-y-4">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-slate-800">지역 찾기</p>
        <DemandRegionPicker
          className="mt-2"
          selections={selections}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      </div>

      {!hasSelection ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-600">비교할 지역을 추가해 주세요</p>
          <p className="mt-1 text-xs text-slate-400">예: 서울특별시 → 강서구 → 추가 (최대 5곳)</p>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/80 px-6 py-12 text-center">
          <p className="text-sm text-amber-900">선택한 구 데이터를 준비 중입니다.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            {DEMAND_SNAPSHOT_META.baseMonthLabel} 기준 · {visibleRows.length}곳 비교 · 전월세·매매는 신고
            건수 · 검색지수는 전월 대비(%) · 열 제목으로 정렬
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100/80">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/90">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "whitespace-nowrap px-3 py-3 font-semibold text-slate-700 sm:px-4",
                        col.align === "right" ? "text-right" : "text-left"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className={cn(
                          "inline-flex items-center hover:text-teal-800",
                          col.align === "right" && "ml-auto"
                        )}
                      >
                        <span className="hidden sm:inline">{col.label}</span>
                        <span className="sm:hidden">{col.short}</span>
                        <SortIcon col={col.key} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visibleRows.map((row) => (
                  <tr key={row.slug} className="hover:bg-teal-50/30">
                    <td className="px-3 py-3 sm:px-4">
                      {row.hasDetail ? (
                        <Link
                          href={`/demand/region/${row.slug}`}
                          className="font-bold text-teal-800 hover:underline"
                        >
                          {row.gu}
                        </Link>
                      ) : (
                        <span className="font-bold text-slate-700">{row.gu}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4">
                      <DemandMetricCell value={row.packingMom} />
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4">
                      <DemandTradeMetricCell count={row.jeonseCount} momPercent={row.jeonseMom} />
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4">
                      <DemandTradeMetricCell count={row.saleCount} momPercent={row.saleMom} />
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4">
                      <DemandMetricCell value={row.moveInCleanMom} />
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4">
                      {row.indexScore != null ? (
                        <span className="font-black tabular-nums text-teal-700">{row.indexScore}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-slate-500">
            {visibleRows.map((row, i) => (
              <span key={row.slug}>
                {i > 0 ? " · " : null}
                <Link
                  href={`/demand/region/${row.slug}`}
                  className="font-semibold text-teal-700 hover:underline"
                >
                  {row.gu} 상세
                </Link>
              </span>
            ))}
            {compareLink ? (
              <>
                {" · "}
                <Link href={compareLink} className="font-semibold text-slate-600 hover:underline">
                  비교 화면으로
                </Link>
              </>
            ) : null}
          </p>
        </>
      )}
    </div>
  );
}
