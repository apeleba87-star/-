import Link from "next/link";
import { formatReportLinkDate } from "@/lib/report/latest-report-dates";

type Props = {
  reportDate?: string | null;
};

/** 허브 하단 — 마케팅 리포트 보조 진입 */
export default function DemandHubMarketingFootLink({ reportDate }: Props) {
  const href = reportDate ? `/marketing-report/${reportDate}` : "/marketing-report";
  const label = reportDate
    ? `마케팅 리포트 · ${formatReportLinkDate(reportDate)}`
    : "마케팅 리포트";

  return (
    <p className="text-center text-xs text-slate-500">
      <Link href={href} className="font-medium text-indigo-700 hover:underline">
        {label}
      </Link>
    </p>
  );
}
