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
  "min-h-11 w-full rounded-xl border-2 border-teal-200 bg-white px-3 py-2.5 text-base focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

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
  const draftPath = guSlug ? formatDemandRegionPath(cityId, guSlug) : null;
  const atMax = selections.length >= DEMAND_MAX_REGION_COMPARE;
  const draftKey =
    cityId && guSlug ? demandRegionSelectionKey({ cityId, guSlug }) : "";
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
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="demand-region-city" className="text-sm font-semibold text-slate-800">
            시·도
          </label>
          <select
            id="demand-region-city"
            value={cityId}
            onChange={(e) => onCitySelect(e.target.value)}
            className={cn(SELECT_CLASS, "mt-2")}
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
          <label htmlFor="demand-region-gu" className="text-sm font-semibold text-slate-800">
            구
          </label>
          <select
            id="demand-region-gu"
            value={guSlug}
            onChange={(e) => setGuSlug(e.target.value)}
            disabled={!hasCity}
            className={cn(
              SELECT_CLASS,
              "mt-2",
              !hasCity && "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
            )}
          >
            <option value="">{hasCity ? "구 선택" : "시·도를 먼저 선택"}</option>
            {city?.districts.map((d) => {
              const key = demandRegionSelectionKey({ cityId, guSlug: d.slug });
              const picked = selections.some((s) => demandRegionSelectionKey(s) === key);
              return (
                <option key={d.slug} value={d.slug} disabled={picked}>
                  {city.label} › {d.gu}
                  {picked ? " (추가됨)" : ""}
                </option>
              );
            })}
          </select>
        </div>

        <button
          type="button"
          onClick={addDraft}
          disabled={!draftPath || atMax || isDuplicate}
          className="min-h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          추가
        </button>
      </div>

      {draftPath && isDuplicate ? (
        <p className="text-xs text-amber-700">이미 비교 목록에 있는 지역입니다.</p>
      ) : null}
      {atMax ? (
        <p className="text-xs text-slate-500">비교는 최대 {DEMAND_MAX_REGION_COMPARE}곳까지 가능합니다.</p>
      ) : (
        <p className="text-xs text-slate-500">
          시·도와 구를 고른 뒤 <strong>추가</strong> — 최대 {DEMAND_MAX_REGION_COMPARE}곳까지 표에서 비교합니다.
        </p>
      )}

      {selections.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="비교 지역 목록">
          {selections.map((sel) => {
            const path = formatDemandRegionPath(sel.cityId, sel.guSlug);
            const key = demandRegionSelectionKey(sel);
            if (!path) return null;
            const [cityLabel, guLabel] = path.split(" > ");
            return (
              <li key={key}>
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50/80 py-1.5 pl-3 pr-1.5 text-sm">
                  <span className="text-slate-500">{cityLabel}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
                  <span className="font-semibold text-teal-900">{guLabel}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    className="ml-1 rounded-full p-0.5 text-slate-400 hover:bg-teal-100 hover:text-teal-900"
                    aria-label={`${path} 제거`}
                  >
                    <X className="h-4 w-4" />
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
