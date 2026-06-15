"use client";

import { MagamFieldLabel, magamInputClass } from "@/components/magam/ui/MagamUi";
import {
  MAGAM_REGION_CITIES,
  magamCityById,
  magamDefaultDistrictSlug,
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
  const city = magamCityById(cityId);
  const districts = city?.districts ?? [];

  return (
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
  );
}
