"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import {
  SORT_OPTIONS,
  type SortOption,
  type JobsListSearchParams,
} from "@/lib/jobs/job-list-options";
import {
  REGION_SIDO_LIST,
  REGION_GUGUN,
  type RegionSido,
} from "@/lib/listings/regions";
import { JOB_TYPE_PRESETS } from "@/lib/jobs/job-type-presets";
import { SKILL_LEVEL_LABELS } from "@/lib/jobs/job-type-presets";

type Props = {
  currentSort: SortOption;
  currentFilters: {
    region?: string;
    district?: string;
    job_type?: string;
    skill_level?: string;
    work_date_from?: string;
    work_date_to?: string;
  };
};

export default function JobsListToolbar({
  currentSort,
  currentFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback(
    (updates: Partial<JobsListSearchParams>) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      Object.entries(updates).forEach(([k, v]) => {
        if (v !== undefined && v !== "") next.set(k, String(v));
        else next.delete(k);
      });
      router.push(`${pathname}${next.toString() ? `?${next}` : ""}`);
    },
    [pathname, router, searchParams]
  );

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === currentSort)?.label ?? "최신순";
  const regionSido =
    currentFilters.region &&
    (REGION_SIDO_LIST as readonly string[]).includes(currentFilters.region)
      ? (currentFilters.region as RegionSido)
      : ("" as RegionSido | "");
  const gugunOptions =
    regionSido && regionSido in REGION_GUGUN ? REGION_GUGUN[regionSido] ?? [] : [];

  return (
    <div className="mt-4 space-y-4">
      {/* 정렬 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
          >
            정렬: {currentSortLabel}
            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform ${sortOpen ? "rotate-180" : ""}`}
            />
          </button>
          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setSortOpen(false)}
              />
              <ul
                className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                role="listbox"
              >
                {SORT_OPTIONS.map((opt) => (
                  <li key={opt.value} role="option">
                    <button
                      type="button"
                      className={`w-full px-4 py-2.5 text-left text-sm ${
                        currentSort === opt.value
                          ? "bg-blue-50 font-medium text-blue-800"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        navigate({ sort: opt.value });
                        setSortOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* 필터 */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          필터
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">지역</span>
            <select
              value={regionSido}
              onChange={(e) =>
                navigate({
                  region: e.target.value || undefined,
                  district: undefined,
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">전체</option>
              {REGION_SIDO_LIST.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {regionSido && gugunOptions.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">지역구</span>
              <select
                value={currentFilters.district ?? ""}
                onChange={(e) =>
                  navigate({ district: e.target.value || undefined })
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="">전체</option>
                {gugunOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">작업종류</span>
            <select
              value={currentFilters.job_type ?? ""}
              onChange={(e) =>
                navigate({ job_type: e.target.value || undefined })
              }
              className="min-w-[120px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">전체</option>
              {JOB_TYPE_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">숙련도</span>
            <select
              value={currentFilters.skill_level ?? ""}
              onChange={(e) =>
                navigate({ skill_level: e.target.value || undefined })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">전체</option>
              <option value="expert">{SKILL_LEVEL_LABELS.expert}</option>
              <option value="general">{SKILL_LEVEL_LABELS.general}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">작업일부터</span>
            <input
              type="date"
              value={currentFilters.work_date_from ?? ""}
              onChange={(e) =>
                navigate({
                  work_date_from: e.target.value || undefined,
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">작업일까지</span>
            <input
              type="date"
              value={currentFilters.work_date_to ?? ""}
              onChange={(e) =>
                navigate({ work_date_to: e.target.value || undefined })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            />
          </label>
          {(currentFilters.region ||
            currentFilters.district ||
            currentFilters.job_type ||
            currentFilters.skill_level ||
            currentFilters.work_date_from ||
            currentFilters.work_date_to) && (
            <button
              type="button"
              onClick={() =>
                navigate({
                  region: undefined,
                  district: undefined,
                  job_type: undefined,
                  skill_level: undefined,
                  work_date_from: undefined,
                  work_date_to: undefined,
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
