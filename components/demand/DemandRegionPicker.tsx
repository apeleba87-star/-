"use client";

import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import {
  DEMAND_MAX_REGION_COMPARE,
  DEMAND_REGIONS,
  demandRegionSelectionKey,
  formatDemandRegionPath,
  getDemandCity,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-200";

type Props = {
  selections: DemandRegionSelection[];
  onAdd: (sel: DemandRegionSelection) => void;
  onRemove: (key: string) => void;
  className?: string;
};

export default function DemandRegionPicker({ selections, onAdd, onRemove, className }: Props) {
  const [cityId, setCityId] = useState("");
  const [guSlug, setGuSlug] = useState("");

  const city = getDemandCity(cityId);
  const hasCity = cityId.length > 0;
  const atMax = selections.length >= DEMAND_MAX_REGION_COMPARE;
  const draftKey = cityId && guSlug ? demandRegionSelectionKey({ cityId, guSlug }) : "";
  const isDuplicate = selections.some((s) => demandRegionSelectionKey(s) === draftKey);

  function onCitySelect(nextId: string) {
    setCityId(nextId);
    setGuSlug("");
  }

  function addDraft() {
    if (!cityId || !guSlug || atMax || isDuplicate) return;
    onAdd({ cityId, guSlug });
    setGuSlug("");
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="demand-region-city" className="text-xs font-medium text-slate-600">
            시·도
          </label>
          <select
            id="demand-region-city"
            value={cityId}
            onChange={(e) => onCitySelect(e.target.value)}
            className={cn(SELECT_CLASS, "mt-1")}
          >
            <option value="">선택</option>
            {DEMAND_REGIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullLabel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="demand-region-gu" className="text-xs font-medium text-slate-600">
            구
          </label>
          <select
            id="demand-region-gu"
            value={guSlug}
            onChange={(e) => setGuSlug(e.target.value)}
            disabled={!hasCity}
            className={cn(
              SELECT_CLASS,
              "mt-1",
              !hasCity && "cursor-not-allowed bg-slate-50 text-slate-400"
            )}
          >
            <option value="">{hasCity ? "구 선택" : "시·도 먼저"}</option>
            {city?.districts.map((d) => {
              const key = demandRegionSelectionKey({ cityId, guSlug: d.slug });
              const picked = selections.some((s) => demandRegionSelectionKey(s) === key);
              return (
                <option key={d.slug} value={d.slug} disabled={picked}>
                  {city.label} &gt; {d.gu}
                  {picked ? " · 추가됨" : ""}
                </option>
              );
            })}
          </select>
        </div>

        <button
          type="button"
          onClick={addDraft}
          disabled={!guSlug || !hasCity || atMax || isDuplicate}
          className="min-h-10 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40 sm:mt-5"
        >
          추가
        </button>
      </div>

      <p className="text-xs text-slate-500">
        {atMax
          ? `최대 ${DEMAND_MAX_REGION_COMPARE}곳까지 비교할 수 있습니다.`
          : selections.length === 0
            ? "서울특별시 → 구 순서로 선택하세요."
            : `${selections.length}/${DEMAND_MAX_REGION_COMPARE}곳 선택됨`}
      </p>

      {selections.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="선택한 지역">
          {selections.map((sel) => {
            const path = formatDemandRegionPath(sel.cityId, sel.guSlug);
            const key = demandRegionSelectionKey(sel);
            if (!path) return null;
            const [cityLabel, guLabel] = path.split(" > ");
            return (
              <li key={key}>
                <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 py-1 pl-2 pr-1 text-sm text-slate-800">
                  <span className="text-slate-500">{cityLabel}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="font-medium">{guLabel}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    className="ml-0.5 rounded p-0.5 text-slate-400 hover:text-slate-700"
                    aria-label={`${path} 제거`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
