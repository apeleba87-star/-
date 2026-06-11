import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { jobWageReportHref, type JobWageHubTeaser } from "@/lib/report/job-wage-hub-teaser";
import { jobWageHubSlimDetail, jobWageHubSlimHook } from "@/lib/report/job-wage-hub-copy";

type Props = {
  teaser: JobWageHubTeaser;
};

/** 지역 미선택 시 — 펄스 아래 당일 시세 한 줄 진입 */
export default function DemandHubJobWageSlimLink({ teaser }: Props) {
  const href = jobWageReportHref(teaser.reportDate);

  return (
    <Link
      href={href}
      className="group flex min-h-10 items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50/80 px-3 py-2 text-sm transition hover:border-teal-200 hover:bg-teal-50/50"
    >
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
        일당
      </span>
      <span className="min-w-0 flex-1 truncate text-slate-700">
        <span className="font-medium text-slate-800">{jobWageHubSlimHook()}</span>
        <span className="text-slate-500">
          {" "}
          · {jobWageHubSlimDetail(teaser.excerpt, teaser.dominantCategory)}
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-teal-700"
        aria-hidden
      />
    </Link>
  );
}
