"use client";

import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import {
  DEMAND_MAX_REGION_COMPARE,
  DEMAND_REGIONS,
  demandRegionSelectionKey,
  formatDemandRegionLabel,
  getDemandCity,
  getDemandDistrictRef,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-200";

const NATIONAL_VALUE = "__national__";
const CITY_WHOLE_VALUE = "__city_whole__";

type Props = {
  selections: DemandRegionSelection[];
  onAdd: (sel: DemandRegionSelection) => void;
  onRemove: (key: string) => void;
  className?: string;
};

function selectionFromDraft(cityId: string, guValue: string): DemandRegionSelection | null {
  if (cityId === NATIONAL_VALUE) return { scope: "national" };
  if (!cityId) return null;
  if (guValue === CITY_WHOLE_VALUE) return { scope: "city", cityId };
  if (!guValue) return null;
  return { scope: "district", cityId, guSlug: guValue };
}

function districtOptionLabel(cityId: string, gu: string): string {
  const city = getDemandCity(cityId);
  if (!city) return gu;
  return `${city.fullLabel} ${gu}`;
}

export default function DemandRegionPicker({ selections, onAdd, onRemove, className }: Props) {
  const [cityId, setCityId] = useState("");
  const [guValue, setGuValue] = useState("");

  const isNational = cityId === NATIONAL_VALUE;
  const city = cityId && !isNational ? DEMAND_REGIONS.find((c) => c.id === cityId) : undefined;
  const atMax = selections.length >= DEMAND_MAX_REGION_COMPARE;

  const draft = selectionFromDraft(cityId, guValue);
  const draftKey = draft ? demandRegionSelectionKey(draft) : "";
  const isDuplicate = draftKey ? selections.some((s) => demandRegionSelectionKey(s) === draftKey) : false;

  function onCitySelect(nextId: string) {
    setCityId(nextId);
    if (nextId === NATIONAL_VALUE) {
      setGuValue("");
    } else {
      setGuValue(CITY_WHOLE_VALUE);
    }
  }

  function addDraft() {
    if (!draft || atMax || isDuplicate) return;
    onAdd(draft);
    if (draft.scope === "national") {
      setCityId("");
      setGuValue("");
    } else if (draft.scope === "city") {
      setGuValue("");
    } else {
      setGuValue(CITY_WHOLE_VALUE);
    }
  }

  function quickAdd(sel: DemandRegionSelection) {
    const key = demandRegionSelectionKey(sel);
    if (atMax || selections.some((s) => demandRegionSelectionKey(s) === key)) return;
    onAdd(sel);
  }

  const canAdd =
    draft != null && !atMax && !isDuplicate && (isNational || (cityId && guValue));

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={atMax || selections.some((s) => s.scope === "national")}
          onClick={() => quickAdd({ scope: "national" })}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-40"
        >
          + 전국
        </button>
        <button
          type="button"
          disabled={atMax || selections.some((s) => s.scope === "city" && s.cityId === "seoul")}
          onClick={() => quickAdd({ scope: "city", cityId: "seoul" })}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-40"
        >
          + 서울특별시
        </button>
      </div>

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
            <option value={NATIONAL_VALUE}>전국</option>
            {DEMAND_REGIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullLabel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="demand-region-gu" className="text-xs font-medium text-slate-600">
            {isNational ? "—" : "시·군·구"}
          </label>
          <select
            id="demand-region-gu"
            value={guValue}
            onChange={(e) => setGuValue(e.target.value)}
            disabled={!cityId || isNational}
            className={cn(
              SELECT_CLASS,
              "mt-1",
              (!cityId || isNational) && "cursor-not-allowed bg-slate-50 text-slate-400"
            )}
          >
            <option value="">
              {!cityId ? "시·도 먼저" : isNational ? "전국 단일" : "선택"}
            </option>
            {city ? <option value={CITY_WHOLE_VALUE}>{city.fullLabel} 전체</option> : null}
            {city?.districts.map((d) => {
              const sel: DemandRegionSelection = {
                scope: "district",
                cityId: city.id,
                guSlug: d.slug,
              };
              const key = demandRegionSelectionKey(sel);
              const picked = selections.some((s) => demandRegionSelectionKey(s) === key);
              return (
                <option key={d.slug} value={d.slug} disabled={picked}>
                  {districtOptionLabel(city.id, d.gu)}
                  {picked ? " · 추가됨" : ""}
                </option>
              );
            })}
          </select>
        </div>

        <button
          type="button"
          onClick={addDraft}
          disabled={!canAdd}
          className="min-h-10 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40 sm:mt-5"
        >
          추가
        </button>
      </div>

      <p className="text-xs text-slate-500">
        {atMax
          ? `최대 ${DEMAND_MAX_REGION_COMPARE}곳까지 비교할 수 있습니다.`
          : selections.length === 0
            ? "전국 · 시·도 전체 · 시·군·구 순서로 고를 수 있습니다."
            : `${selections.length}/${DEMAND_MAX_REGION_COMPARE}곳 선택됨`}
      </p>

      {selections.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="선택한 지역">
          {selections.map((sel) => {
            const label = formatDemandRegionLabel(sel);
            const key = demandRegionSelectionKey(sel);
            if (!label) return null;

            let prefix: string | null = null;
            let suffix: string | null = null;
            if (sel.scope === "district") {
              const cityMeta = getDemandCity(sel.cityId);
              const district = getDemandDistrictRef(sel.cityId, sel.guSlug);
              if (cityMeta && district) {
                prefix = cityMeta.fullLabel;
                suffix = district.gu;
              }
            }

            return (
              <li key={key}>
                <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 py-1 pl-2 pr-1 text-sm text-slate-800">
                  {prefix && suffix ? (
                    <>
                      <span className="text-slate-500">{prefix}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                      <span className="font-medium">{suffix}</span>
                    </>
                  ) : (
                    <span className="font-medium">{label}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    className="ml-0.5 rounded p-0.5 text-slate-400 hover:text-slate-700"
                    aria-label={`${label} 제거`}
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
