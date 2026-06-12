import Link from "next/link";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";

type Props = {
  jobs: PublicJobOpeningListItem[];
  regionLabel: string;
  regionListHref: string | null;
  regionalCount: number;
};

export default function PublicJobDetailRelatedList({
  jobs,
  regionLabel,
  regionListHref,
  regionalCount,
}: Props) {
  if (jobs.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="detail-related">
      <div className="flex items-center justify-between gap-3">
        <h2 id="detail-related" className="text-lg font-bold text-slate-900">
          {PUBLIC_JOBS_COPY.detailSameRegion}
        </h2>
        {regionListHref ? (
          <Link
            href={regionListHref}
            className="shrink-0 text-sm font-semibold text-blue-800 underline"
          >
            {PUBLIC_JOBS_COPY.detailRegionMoreJobs}
          </Link>
        ) : null}
      </div>
      <p className="mt-0.5 text-sm text-slate-500">
        {regionLabel} {regionalCount.toLocaleString("ko-KR")}
        {PUBLIC_JOBS_COPY.regionCountSuffix}
      </p>
      <ul className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {jobs.map((rel) => (
          <li key={rel.id}>
            <Link
              href={`/jobs/public/${encodeURIComponent(rel.id)}`}
              className="flex items-center gap-3 px-3 py-3 active:bg-slate-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block line-clamp-1 text-sm font-semibold text-slate-900">
                  {rel.title}
                </span>
                {rel.company ? (
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{rel.company}</span>
                ) : null}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-extrabold tabular-nums text-blue-900">
                  {rel.pay_display || PUBLIC_JOBS_COPY.payNegotiable}
                </span>
                <span className="text-xs text-blue-700">{PUBLIC_JOBS_COPY.rowDetailCta}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
