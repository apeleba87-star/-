"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEMAND_REGIONS, demandRegionSelectionKey } from "@/lib/demand/regions";

type Props = {
  yearMonth: string;
  activeRegionKey: string;
};

type ScopeFilter = "district" | "city" | "national";

export default function AdminDemandRegionViewPicker({ yearMonth, activeRegionKey }: Props) {
  const initialCityId = useMemo(() => {
    if (activeRegionKey.startsWith("district:")) {
      const rest = activeRegionKey.slice("district:".length);
      const colon = rest.indexOf(":");
      return colon > 0 ? rest.slice(0, colon) : "seoul";
    }
    if (activeRegionKey.startsWith("city:")) {
      return activeRegionKey.slice("city:".length);
    }
    return "seoul";
  }, [activeRegionKey]);

  const [cityId, setCityId] = useState(initialCityId);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(
    activeRegionKey === "national"
      ? "national"
      : activeRegionKey.startsWith("city:")
        ? "city"
        : "district"
  );

  const city = DEMAND_REGIONS.find((c) => c.id === cityId) ?? DEMAND_REGIONS[0]!;
  const districts = city?.districts ?? [];

  function hrefForKey(regionKey: string) {
    return `/admin/radar-ads/region-views?month=${encodeURIComponent(yearMonth)}&region=${encodeURIComponent(regionKey)}`;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["district", "시·군·구"],
            ["city", "시·도"],
            ["national", "전국"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setScopeFilter(id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              scopeFilter === id ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {scopeFilter === "national" ? (
        <Link
          href={hrefForKey("national")}
          className={`inline-flex rounded-lg px-3 py-2 text-sm font-semibold ${
            activeRegionKey === "national" ? "bg-teal-700 text-white" : "bg-white text-teal-800 ring-1 ring-teal-200 hover:bg-teal-50"
          }`}
        >
          전국 (national)
        </Link>
      ) : null}

      {scopeFilter !== "national" ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">
            시·도
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            >
              {DEMAND_REGIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullLabel}
                </option>
              ))}
            </select>
          </label>
          {scopeFilter === "city" ? (
            <Link
              href={hrefForKey(demandRegionSelectionKey({ scope: "city", cityId: city.id }))}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                activeRegionKey === demandRegionSelectionKey({ scope: "city", cityId: city.id })
                  ? "bg-teal-700 text-white"
                  : "bg-white text-teal-800 ring-1 ring-teal-200 hover:bg-teal-50"
              }`}
            >
              {city.fullLabel} 전체 보기
            </Link>
          ) : null}
        </div>
      ) : null}

      {scopeFilter === "district" ? (
        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
          <div className="flex flex-wrap gap-1.5">
            {districts.map((d) => {
              const key = demandRegionSelectionKey({
                scope: "district",
                cityId: city.id,
                guSlug: d.slug,
              });
              const active = key === activeRegionKey;
              return (
                <Link
                  key={key}
                  href={hrefForKey(key)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    active ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {d.gu}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {scopeFilter === "city" ? (
        <div className="flex flex-wrap gap-1.5">
          {DEMAND_REGIONS.map((c) => {
            const key = demandRegionSelectionKey({ scope: "city", cityId: c.id });
            const active = key === activeRegionKey;
            return (
              <Link
                key={key}
                href={hrefForKey(key)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  active ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
