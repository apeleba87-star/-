import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { jobWageReportListExcerptFromPayload } from "@/lib/jobs/job-wage-dominant-label";
import { formatReportLinkDate } from "@/lib/report/latest-report-dates";

export type JobWageRecentReportRow = {
  report_date: string;
  headline: string | null;
  payload: unknown;
};

type Props = {
  rows: JobWageRecentReportRow[];
  provinceQuery?: string | null;
};

export default function JobWageReportRecentDates({ rows, provinceQuery }: Props) {
  if (rows.length === 0) return null;

  const provinceSuffix =
    provinceQuery?.trim() ? `?province=${encodeURIComponent(provinceQuery.trim())}` : "";

  return (
    <section className="mt-2" aria-label="다른 날 일당 리포트">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">다른 날 보기</p>
      <p className="mt-1 text-sm text-slate-600">어제·그제 시세와 비교해 볼까요?</p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => {
          const excerpt = jobWageReportListExcerptFromPayload(row.payload, row.headline ?? "");
          return (
            <li key={row.report_date}>
              <Link
                href={`/job-market-report/${row.report_date}${provinceSuffix}`}
                className="group flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100/80 transition hover:border-teal-200 hover:bg-teal-50/40 hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {formatReportLinkDate(row.report_date)} 일당
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-600 group-hover:text-slate-700">
                    {excerpt}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-700"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
