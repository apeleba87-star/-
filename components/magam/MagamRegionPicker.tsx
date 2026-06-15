"use client";

import { useEffect, useState } from "react";

import { MagamChoiceChip, MagamFieldLabel, MagamSubLabel, magamInputClass } from "@/components/magam/ui/MagamUi";
import { loadMagamRecentRegions, type MagamRecentRegion } from "@/lib/magam/recent-regions";
import {
  MAGAM_REGION_CITIES,
  magamCityById,
  magamDefaultDistrictSlug,
  magamRegionDisplayLabel,
} from "@/lib/magam/regions";

type Props = {
  cityId: string;
  districtSlug: string;
  disabled?: boolean;
  onCityChange: (cityId: string) => void;
  onDistrictChange: (districtSlug: string) => void;
};

export default function MagamRegionPicker({
  cityId,
  districtSlug,
  disabled,
  onCityChange,
  onDistrictChange,
}: Props) {
  const [recentRegions, setRecentRegions] = useState<MagamRecentRegion[]>([]);
  const city = magamCityById(cityId);
  const districts = city?.districts ?? [];
  const regionLabel = magamRegionDisplayLabel(cityId, districtSlug);

  useEffect(() => {
    setRecentRegions(loadMagamRecentRegions());
  }, []);

  return (
    <div className="space-y-4">
      {recentRegions.length > 0 ? (
        <div>
          <MagamSubLabel>최근 지역</MagamSubLabel>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {recentRegions.map((recent) => (
              <MagamChoiceChip
                key={`${recent.cityId}:${recent.districtSlug}`}
                selected={
                  cityId === recent.cityId && districtSlug === recent.districtSlug
                }
                disabled={disabled}
                onClick={() => {
                  onCityChange(recent.cityId);
                  onDistrictChange(recent.districtSlug);
                }}
              >
                {magamRegionDisplayLabel(recent.cityId, recent.districtSlug)}
              </MagamChoiceChip>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <MagamFieldLabel htmlFor="magam-city">시·도</MagamFieldLabel>
          <select
            id="magam-city"
            className={magamInputClass}
            disabled={disabled}
            value={cityId}
            onChange={(e) => {
              const nextCity = e.target.value;
              onCityChange(nextCity);
              onDistrictChange(magamDefaultDistrictSlug(nextCity));
            }}
          >
            {MAGAM_REGION_CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <MagamFieldLabel htmlFor="magam-district">시·군·구</MagamFieldLabel>
          <select
            id="magam-district"
            className={magamInputClass}
            disabled={disabled || districts.length === 0}
            value={districtSlug}
            onChange={(e) => onDistrictChange(e.target.value)}
          >
            {districts.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.gu}
              </option>
            ))}
          </select>
        </div>
      </div>

      {regionLabel ? (
        <div className="rounded-[10px] bg-[#EEF3FF] px-3 py-2.5 text-[15px] font-semibold text-[#2563EB]">
          {regionLabel}
        </div>
      ) : null}
    </div>
  );
}
