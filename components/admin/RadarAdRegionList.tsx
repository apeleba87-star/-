"use client";

import { useMemo, useState } from "react";
import {
  DEMAND_REGIONS,
  demandRegionSelectionKey,
  formatDemandRegionLabel,
} from "@/lib/demand/regions";
import {
  countLiveRadarSlots,
  formatRadarAdRegionShortLabel,
  formatRegionWithLiveCount,
} from "@/lib/demand/radar-ads-slot";
import { cn } from "@/lib/utils";

type RegionBanner = {
  id: string;
  region_key: string | null;
  enabled: boolean;
};

type SlotLike = {
  status: string;
  start_date: string;
  end_date: string;
};

type RegionOption = {
  key: string;
  label: string;
  shortLabel: string;
};

function buildAllRegionOptions(): RegionOption[] {
  const out: RegionOption[] = [];
  for (const city of DEMAND_REGIONS) {
    const citySel = { scope: "city" as const, cityId: city.id };
    const cityKey = demandRegionSelectionKey(citySel);
    const cityLabel = formatDemandRegionLabel(citySel);
    if (cityLabel) {
      out.push({
        key: cityKey,
        label: `${cityLabel} (시·도 전체)`,
        shortLabel: formatRadarAdRegionShortLabel(cityKey),
      });
    }
    for (const d of city.districts) {
      const distSel = { scope: "district" as const, cityId: city.id, guSlug: d.slug };
      const key = demandRegionSelectionKey(distSel);
      const label = formatDemandRegionLabel(distSel);
      if (label) {
        out.push({ key, label, shortLabel: formatRadarAdRegionShortLabel(key) });
      }
    }
  }
  return out;
}

const ALL_REGION_OPTIONS = buildAllRegionOptions();

type Props = {
  regionalBanners: RegionBanner[];
  regionalSlotsByBannerId: Record<string, SlotLike[]>;
  today: string;
  selectedId: string | null;
  onSelect: (bannerId: string) => void;
  onAdd: (regionKey: string) => void;
  adding: boolean;
  className?: string;
};

export default function RadarAdRegionList({
  regionalBanners,
  regionalSlotsByBannerId,
  today,
  selectedId,
  onSelect,
  onAdd,
  adding,
  className,
}: Props) {
  const [search, setSearch] = useState("");

  const bannerByKey = useMemo(() => {
    const map = new Map<string, RegionBanner>();
    for (const b of regionalBanners) {
      if (b.region_key) map.set(b.region_key, b);
    }
    return map;
  }, [regionalBanners]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_REGION_OPTIONS;
    return ALL_REGION_OPTIONS.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.shortLabel.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q)
    );
  }, [search]);

  const registeredCount = regionalBanners.length;

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        <label htmlFor="radar-region-search" className="text-xs font-medium text-slate-600">
          지역 찾기 · 추가
          {registeredCount > 0 ? (
            <span className="ml-1 font-normal text-slate-400">(등록 {registeredCount})</span>
          ) : null}
        </label>
        <input
          id="radar-region-search"
          className="input mt-1 w-full text-sm"
          placeholder="예: 서울, 강서구, 부산 해운대구…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="mt-1 text-[11px] text-slate-500">
          목록에서 지역을 찾아 추가하거나, 이미 등록된 지역을 선택하세요.
        </p>
      </div>

      <ul className="max-h-[min(420px,50vh)] space-y-0.5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
        {filtered.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-slate-500">검색 결과가 없습니다.</li>
        ) : (
          filtered.map((region) => {
            const banner = bannerByKey.get(region.key);
            const live = banner
              ? countLiveRadarSlots(regionalSlotsByBannerId[banner.id] ?? [], today)
              : 0;
            const active = banner?.id === selectedId;

            if (banner) {
              const countLabel = formatRegionWithLiveCount(region.shortLabel, live);
              return (
                <li key={region.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(banner.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      active ? "bg-slate-800 text-white" : "hover:bg-slate-50"
                    )}
                  >
                    <span className="min-w-0 truncate font-medium">{countLabel}</span>
                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-medium",
                        active ? "text-slate-300" : "text-teal-700"
                      )}
                    >
                      {banner.enabled ? "편집" : "꺼짐"}
                    </span>
                  </button>
                </li>
              );
            }

            return (
              <li key={region.key}>
                <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-slate-50">
                  <span className="min-w-0 truncate text-sm text-slate-700">{region.label}</span>
                  <button
                    type="button"
                    disabled={adding}
                    onClick={() => onAdd(region.key)}
                    className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {adding ? "…" : "추가"}
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
