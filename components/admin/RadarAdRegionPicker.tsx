"use client";

import { useMemo, useState } from "react";
import {
  DEMAND_REGIONS,
  demandRegionSelectionKey,
  formatDemandRegionLabel,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-200";

const CITY_WHOLE_VALUE = "__city_whole__";

type Props = {
  onConfirm: (regionKey: string, label: string) => void;
  disabledKeys?: ReadonlySet<string>;
  confirmLabel?: string;
  disabled?: boolean;
  className?: string;
};

function selectionFromDraft(cityId: string, guValue: string): DemandRegionSelection | null {
  if (!cityId) return null;
  if (guValue === CITY_WHOLE_VALUE) return { scope: "city", cityId };
  if (!guValue) return null;
  return { scope: "district", cityId, guSlug: guValue };
}

export default function RadarAdRegionPicker({
  onConfirm,
  disabledKeys,
  confirmLabel = "지역 배너 추가",
  disabled = false,
  className,
}: Props) {
  const [cityId, setCityId] = useState("");
  const [guValue, setGuValue] = useState("");

  const city = useMemo(() => DEMAND_REGIONS.find((c) => c.id === cityId), [cityId]);
  const draft = selectionFromDraft(cityId, guValue);
  const draftKey = draft ? demandRegionSelectionKey(draft) : "";
  const draftLabel = draft ? formatDemandRegionLabel(draft) : null;
  const isDuplicate = draftKey ? (disabledKeys?.has(draftKey) ?? false) : false;
  const canConfirm = Boolean(draft && draftLabel && !isDuplicate && !disabled);

  function onCitySelect(nextId: string) {
    setCityId(nextId);
    setGuValue(nextId ? CITY_WHOLE_VALUE : "");
  }

  function confirm() {
    if (!draft || !draftLabel || isDuplicate) return;
    onConfirm(demandRegionSelectionKey(draft), draftLabel);
    setCityId("");
    setGuValue("");
  }

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-slate-50/50 p-4", className)}>
      <p className="text-sm font-medium text-slate-800">새 지역 배너</p>
      <p className="mt-1 text-xs text-slate-500">
        입주레이더에서 사용자가 고르는 지역과 동일합니다. 시·도 전체 또는 구·군 단위로 추가하세요.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="radar-ad-city" className="text-xs font-medium text-slate-600">
            시·도
          </label>
          <select
            id="radar-ad-city"
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
          <label htmlFor="radar-ad-gu" className="text-xs font-medium text-slate-600">
            시·군·구
          </label>
          <select
            id="radar-ad-gu"
            value={guValue}
            onChange={(e) => setGuValue(e.target.value)}
            disabled={!cityId}
            className={cn(SELECT_CLASS, "mt-1", !cityId && "cursor-not-allowed bg-slate-100 text-slate-400")}
          >
            <option value="">{cityId ? "선택" : "시·도 먼저"}</option>
            {city ? (() => {
              const cityKey = demandRegionSelectionKey({ scope: "city", cityId: city.id });
              const taken = disabledKeys?.has(cityKey);
              return (
                <option value={CITY_WHOLE_VALUE} disabled={taken}>
                  {city.fullLabel} 전체{taken ? " · 등록됨" : ""}
                </option>
              );
            })() : null}
            {city?.districts.map((d) => {
              const key = demandRegionSelectionKey({
                scope: "district",
                cityId: city.id,
                guSlug: d.slug,
              });
              const taken = disabledKeys?.has(key);
              return (
                <option key={d.slug} value={d.slug} disabled={taken}>
                  {d.gu}
                  {taken ? " · 등록됨" : ""}
                </option>
              );
            })}
          </select>
        </div>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={confirm}
          className="min-h-10 rounded-lg bg-slate-800 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40 sm:mt-5"
        >
          {confirmLabel}
        </button>
      </div>
      {isDuplicate ? (
        <p className="mt-2 text-xs text-amber-700">이미 등록된 지역입니다. 아래 목록에서 선택하세요.</p>
      ) : draftLabel ? (
        <p className="mt-2 text-xs text-slate-600">
          추가 예정: <span className="font-medium text-slate-800">{draftLabel}</span>
        </p>
      ) : null}
    </div>
  );
}
