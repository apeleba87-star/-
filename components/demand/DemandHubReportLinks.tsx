import Link from "next/link";
import { formatReportLinkDate, type LatestReportDates } from "@/lib/report/latest-report-dates";

type Props = {
  latest: LatestReportDates;
};

/** 입주레이더 허브 — 일당·마케팅 리포트 진입 */
export default function DemandHubReportLinks({ latest }: Props) {
  const jobHref = latest.jobWageReportDate
    ? `/job-market-report/${latest.jobWageReportDate}`
    : "/job-market-report";
  const marketingHref = latest.marketingReportDate
    ? `/marketing-report/${latest.marketingReportDate}`
    : "/marketing-report";

  const jobLabel = latest.jobWageReportDate
    ? `일당 리포트 · ${formatReportLinkDate(latest.jobWageReportDate)}`
    : "일당 리포트";
  const marketingLabel = latest.marketingReportDate
    ? `마케팅 리포트 · ${formatReportLinkDate(latest.marketingReportDate)}`
    : "마케팅 리포트";

  return (
    <section
      className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3"
      aria-label="일간 리포트"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">일간 리포트</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={jobHref}
          className="inline-flex min-h-9 items-center rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/60"
        >
          {jobLabel}
        </Link>
        <Link
          href={marketingHref}
          className="inline-flex min-h-9 items-center rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-800 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/60"
        >
          {marketingLabel}
        </Link>
      </div>
    </section>
  );
}
