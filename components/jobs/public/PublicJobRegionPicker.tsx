"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { DEMAND_REGIONS } from "@/lib/demand/regions";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import {
  jobPublicDraftFromScope,
  jobPublicRegionLabelFromDraft,
  type JobPublicRegionDraft,
} from "@/lib/jobs-public/job-region-scope";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3 text-lg focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-200";

const NATIONAL_VALUE = "__national__";
const CITY_WHOLE_VALUE = "__city_whole__";

function draftToPickerState(draft: JobPublicRegionDraft): {
  cityId: string;
  guValue: string;
} {
  if (draft.scope === "national") {
    return { cityId: NATIONAL_VALUE, guValue: "" };
  }
  if (draft.scope === "city") {
    return { cityId: draft.cityId, guValue: CITY_WHOLE_VALUE };
  }
  return { cityId: draft.cityId, guValue: draft.guSlug };
}

function pickerStateToDraft(
  cityId: string,
  guValue: string
): JobPublicRegionDraft | null {
  if (cityId === NATIONAL_VALUE) return { scope: "national" };
  if (!cityId) return null;
  if (guValue === CITY_WHOLE_VALUE) return { scope: "city", cityId };
  if (!guValue) return null;
  return { scope: "district", cityId, guSlug: guValue };
}

type Props = {
  currentSido: string;
  currentSigungu: string | null;
  jobCount?: number;
};

export default function PublicJobRegionPicker({
  currentSido,
  currentSigungu,
  jobCount,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initialDraft = useMemo(
    () =>
      jobPublicDraftFromScope({ sido: currentSido, sigungu: currentSigungu }) ?? {
        scope: "city" as const,
        cityId: "seoul",
      },
    [currentSido, currentSigungu]
  );

  const initialPicker = useMemo(() => draftToPickerState(initialDraft), [initialDraft]);

  const [cityId, setCityId] = useState(initialPicker.cityId);
  const [guValue, setGuValue] = useState(initialPicker.guValue);

  useEffect(() => {
    const next = draftToPickerState(initialDraft);
    setCityId(next.cityId);
    setGuValue(next.guValue);
  }, [initialDraft]);

  const isNational = cityId === NATIONAL_VALUE;
  const city = cityId && !isNational ? DEMAND_REGIONS.find((c) => c.id === cityId) : undefined;
  const draft = pickerStateToDraft(cityId, guValue);
  const draftLabel = draft ? jobPublicRegionLabelFromDraft(draft) : null;
  const currentLabel = jobPublicRegionLabelFromDraft(initialDraft);

  const canApply =
    draft != null &&
    JSON.stringify(draft) !== JSON.stringify(initialDraft) &&
    (isNational || (cityId && guValue));

  function onCitySelect(nextId: string) {
    setCityId(nextId);
    if (nextId === NATIONAL_VALUE) {
      setGuValue("");
    } else {
      setGuValue(CITY_WHOLE_VALUE);
    }
  }

  const apply = () => {
    if (!draft) return;
    startTransition(async () => {
      await fetch("/api/jobs-public/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("page");
      const q = url.searchParams.toString();
      router.replace(q ? `${url.pathname}?${q}` : url.pathname);
      router.refresh();
    });
  };

  return (
    <section className="w-full space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-base font-semibold text-slate-900 ring-1 ring-slate-200">
          📍 {currentLabel}
          {jobCount != null && jobCount > 0 ? (
            <span className="font-bold text-blue-900">
              {jobCount.toLocaleString("ko-KR")}
              {PUBLIC_JOBS_COPY.regionCountSuffix}
            </span>
          ) : null}
        </span>
        {draftLabel && draftLabel !== currentLabel ? (
          <span className="text-sm text-slate-500">→ {draftLabel}</span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="job-public-region-city" className="text-sm font-medium text-slate-700">
            시·도
          </label>
          <select
            id="job-public-region-city"
            value={cityId}
            onChange={(e) => onCitySelect(e.target.value)}
            className={cn(SELECT_CLASS, "mt-1.5")}
          >
            <option value="">선택</option>
            <option value={NATIONAL_VALUE}>{PUBLIC_JOBS_COPY.regionNationalLabel}</option>
            {DEMAND_REGIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullLabel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="job-public-region-gu" className="text-sm font-medium text-slate-700">
            {isNational ? "—" : "시·군·구"}
          </label>
          <select
            id="job-public-region-gu"
            value={guValue}
            onChange={(e) => setGuValue(e.target.value)}
            disabled={!cityId || isNational}
            className={cn(
              SELECT_CLASS,
              "mt-1.5",
              (!cityId || isNational) && "cursor-not-allowed bg-slate-100 text-slate-400"
            )}
          >
            <option value="">
              {!cityId ? "시·도 먼저" : isNational ? "전국 단일" : "선택"}
            </option>
            {city ? (
              <option value={CITY_WHOLE_VALUE}>{city.fullLabel} 전체</option>
            ) : null}
            {city?.districts.map((d) => (
              <option key={d.slug} value={d.slug}>
                {city.fullLabel} {d.gu}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={apply}
          disabled={!canApply || pending || (!isNational && (!cityId || !guValue))}
          className="min-h-[48px] rounded-xl bg-slate-900 px-5 text-lg font-semibold text-white hover:bg-slate-800 disabled:opacity-40 sm:mt-0"
        >
          {pending ? "적용 중…" : "적용"}
        </button>
      </div>

      <p className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <span>전국</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span>시·도 전체</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span>시·군·구</span>
        <span className="text-slate-400">순으로 고를 수 있습니다.</span>
      </p>
    </section>
  );
}
