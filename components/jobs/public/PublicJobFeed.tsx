"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PublicJobCard from "@/components/jobs/public/PublicJobCard";
import { usePublicJobPayMode } from "@/components/jobs/public/PublicJobPayModeProvider";
import PublicJobPayModeToggle from "@/components/jobs/public/PublicJobPayModeToggle";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import { publicJobRowMeta } from "@/lib/jobs-public/public-job-row-meta";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";
import type { PublicJobPayDisplayMode } from "@/lib/jobs-public/pay-display-mode";
import { cn } from "@/lib/utils";

export type PublicJobViewDensity = "compact" | "comfortable";

const DENSITY_STORAGE_KEY = "job_public_view_density";

type Props = {
  jobs: PublicJobOpeningListItem[];
  fallbackJobs?: PublicJobOpeningListItem[];
  showEmpty?: boolean;
};

function loadDensity(): PublicJobViewDensity {
  if (typeof window === "undefined") return "compact";
  try {
    const v = localStorage.getItem(DENSITY_STORAGE_KEY);
    return v === "comfortable" ? "comfortable" : "compact";
  } catch {
    return "compact";
  }
}

function CompactRow({
  job,
  large,
  payMode,
}: {
  job: PublicJobOpeningListItem;
  large?: boolean;
  payMode: PublicJobPayDisplayMode;
}) {
  const meta = publicJobRowMeta(job, { payMode });

  return (
    <tr className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
      <td className={cn("py-2.5 pl-3 pr-2 font-medium text-slate-900", large ? "text-base" : "text-sm")}>
        <Link href={meta.detailHref} className="line-clamp-2 hover:underline">
          {meta.title}
        </Link>
      </td>
      <td className={cn("py-2.5 px-2 font-extrabold tabular-nums text-blue-900 whitespace-nowrap", large ? "text-lg" : "text-sm")}>
        {meta.pay}
      </td>
      <td className={cn("hidden py-2.5 px-2 text-slate-800 sm:table-cell", large ? "text-base" : "text-sm")}>
        {meta.region}
      </td>
      <td className={cn("hidden py-2.5 px-2 text-slate-600 md:table-cell", large ? "text-base" : "text-sm")}>
        {meta.closing}
      </td>
      <td className={cn("hidden py-2.5 px-2 text-slate-600 lg:table-cell", large ? "text-base" : "text-sm")}>
        {meta.preset}
      </td>
      <td className="py-2.5 pr-3 pl-2 text-right whitespace-nowrap">
        <Link
          href={meta.detailHref}
          className={cn(
            "inline-flex min-h-[36px] items-center rounded-lg border-2 border-slate-200 bg-white px-2.5 font-semibold text-slate-800 hover:border-slate-300",
            large ? "text-sm px-3" : "text-xs"
          )}
        >
          {PUBLIC_JOBS_COPY.rowDetailCta}
        </Link>
      </td>
    </tr>
  );
}

function CompactMobileRow({
  job,
  large,
  payMode,
}: {
  job: PublicJobOpeningListItem;
  large?: boolean;
  payMode: PublicJobPayDisplayMode;
}) {
  const meta = publicJobRowMeta(job, { payMode });

  return (
    <li className="border-b border-slate-100 last:border-0">
      <Link
        href={meta.detailHref}
        className="flex min-h-[52px] items-center gap-3 px-3 py-2.5 active:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className={cn("block line-clamp-2 font-semibold text-slate-900", large ? "text-base" : "text-sm")}>
            {meta.title}
          </span>
          <span className={cn("mt-0.5 block truncate text-slate-600", large ? "text-sm" : "text-xs")}>
            {meta.region} · {meta.preset}
          </span>
          <span className={cn("block truncate text-slate-400", large ? "text-sm" : "text-xs")}>
            {meta.closing}
            {meta.company ? ` · ${meta.company}` : ""}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "font-extrabold tabular-nums text-blue-900 whitespace-nowrap",
              large ? "text-base" : "text-sm"
            )}
          >
            {meta.pay}
          </span>
          <span className={cn("text-blue-800", large ? "text-sm" : "text-xs")}>
            {PUBLIC_JOBS_COPY.rowDetailCta}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function PublicJobDensityToggle({
  density,
  onChange,
}: {
  density: PublicJobViewDensity;
  onChange: (d: PublicJobViewDensity) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl border-2 border-slate-200 p-0.5"
      role="group"
      aria-label={PUBLIC_JOBS_COPY.densityToggleLabel}
    >
      <button
        type="button"
        onClick={() => onChange("compact")}
        aria-pressed={density === "compact"}
        className={cn(
          "min-h-[40px] rounded-lg px-3 text-sm font-semibold",
          density === "compact" ? "bg-slate-900 text-white" : "text-slate-600"
        )}
      >
        {PUBLIC_JOBS_COPY.densityCompact}
      </button>
      <button
        type="button"
        onClick={() => onChange("comfortable")}
        aria-pressed={density === "comfortable"}
        className={cn(
          "min-h-[40px] rounded-lg px-3 text-sm font-semibold",
          density === "comfortable" ? "bg-slate-900 text-white" : "text-slate-600"
        )}
      >
        {PUBLIC_JOBS_COPY.densityComfortable}
      </button>
    </div>
  );
}

export default function PublicJobFeed({ jobs, fallbackJobs = [], showEmpty }: Props) {
  const { payMode } = usePublicJobPayMode();
  const [density, setDensity] = useState<PublicJobViewDensity>("compact");

  useEffect(() => {
    setDensity(loadDensity());
  }, []);

  const onDensityChange = useCallback((d: PublicJobViewDensity) => {
    setDensity(d);
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, d);
    } catch {
      // ignore
    }
  }, []);

  const large = density === "comfortable";

  if (showEmpty && jobs.length === 0) {
    return (
      <div className="mt-4 space-y-6">
        <p className="text-lg leading-relaxed text-slate-700">{PUBLIC_JOBS_COPY.feedEmpty}</p>
        <p className="text-base text-slate-500">{PUBLIC_JOBS_COPY.feedEmptyHint}</p>
        {fallbackJobs.length > 0 ? (
          <section aria-labelledby="feed-fallback">
            <h3 id="feed-fallback" className="text-xl font-bold text-slate-900">
              {PUBLIC_JOBS_COPY.feedFallbackTitle}
            </h3>
            <PublicJobFeed jobs={fallbackJobs} />
          </section>
        ) : null}
      </div>
    );
  }

  if (jobs.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PublicJobPayModeToggle />
        <PublicJobDensityToggle density={density} onChange={onDensityChange} />
      </div>

      {density === "comfortable" ? (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <PublicJobCard key={job.id} job={job} large={large} payMode={payMode} />
          ))}
        </ul>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white md:hidden">
            <ul>
              {jobs.map((job) => (
                <CompactMobileRow key={job.id} job={job} large={large} payMode={payMode} />
              ))}
            </ul>
          </div>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pl-3 pr-2">{PUBLIC_JOBS_COPY.tableTitle}</th>
                  <th className="px-2 py-2.5">{PUBLIC_JOBS_COPY.tablePay}</th>
                  <th className="hidden px-2 py-2.5 sm:table-cell">{PUBLIC_JOBS_COPY.tableRegion}</th>
                  <th className="hidden px-2 py-2.5 md:table-cell">{PUBLIC_JOBS_COPY.tableClosing}</th>
                  <th className="hidden px-2 py-2.5 lg:table-cell">{PUBLIC_JOBS_COPY.tablePreset}</th>
                  <th className="py-2.5 pr-3 pl-2 text-right">{PUBLIC_JOBS_COPY.tableAction}</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <CompactRow key={job.id} job={job} large={large} payMode={payMode} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
