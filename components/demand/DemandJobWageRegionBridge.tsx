"use client";

import Link from "next/link";
import { useMemo } from "react";
import { demandSelectionToJobWageProvince } from "@/lib/demand/job-wage-province-from-selection";
import {
  jobWageNationalTopFromTeaser,
  jobWageProvinceFromTeaser,
  jobWageReportHref,
  type JobWageHubTeaser,
} from "@/lib/report/job-wage-hub-teaser";
import {
  JOB_WAGE_HUB_CTA_LABEL,
  jobWageNationalTopBadge,
  jobWageNationalTopHint,
  jobWageRegionBridgeDetail,
  jobWageRegionBridgeHeadline,
} from "@/lib/report/job-wage-hub-copy";
import type { DemandRegionSelection } from "@/lib/demand/regions";

type Props = {
  teaser: JobWageHubTeaser;
  selection: DemandRegionSelection;
  regionLabel: string;
  variant?: "featured" | "compact";
};

/** 지역 선택 후 맥락 브릿지 — 당일 시세 + 전국 최고 비교 */
export default function DemandJobWageRegionBridge({
  teaser,
  selection,
  regionLabel,
  variant = "featured",
}: Props) {
  const province = useMemo(() => demandSelectionToJobWageProvince(selection), [selection]);
  const row = useMemo(
    () => jobWageProvinceFromTeaser(teaser, province),
    [teaser, province]
  );
  const nationalTop = useMemo(() => jobWageNationalTopFromTeaser(teaser), [teaser]);
  const href = jobWageReportHref(teaser.reportDate, province);

  if (!province) return null;

  const hasPosts = row != null && row.jobPostCount > 0;
  const detail = jobWageRegionBridgeDetail(teaser.dominantCategory, teaser.excerpt, hasPosts);
  const isLocalTop = nationalTop != null && nationalTop.province === province;
  const nationalBadge =
    nationalTop != null
      ? jobWageNationalTopBadge(
          nationalTop.province,
          nationalTop.avgDailyWon,
          teaser.amountsVisible,
          isLocalTop
        )
      : null;

  if (variant === "compact") {
    return (
      <p className="mt-3 text-center text-xs text-slate-600">
        <Link href={href} className="font-semibold text-teal-800 hover:underline">
          {regionLabel} 오늘 시세 보기
        </Link>
        {nationalBadge?.amount ? (
          <span className="text-slate-500"> · 전국 최고 {nationalBadge.amount}</span>
        ) : null}
      </p>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50/80 to-white p-4 shadow-sm ring-1 ring-teal-100"
      aria-label={`${regionLabel} 당일 일당 시세`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">오늘 시세</p>
          <h2 className="mt-1 text-base font-bold leading-snug text-slate-900">
            {jobWageRegionBridgeHeadline(regionLabel)}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">{detail}</p>
          {nationalBadge ? (
            <div className="mt-3 rounded-lg border border-teal-200/80 bg-white/90 px-3 py-2">
              <p className="text-xs font-semibold text-teal-800">{nationalBadge.label}</p>
              <p className="mt-0.5 text-sm text-slate-700">
                {nationalBadge.amount ? (
                  <span className="text-lg font-bold tabular-nums text-teal-900">
                    {nationalBadge.amount}
                  </span>
                ) : (
                  <span className="text-slate-500">로그인 후 확인</span>
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">{jobWageNationalTopHint(isLocalTop)}</p>
            </div>
          ) : null}
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
        >
          {JOB_WAGE_HUB_CTA_LABEL}
        </Link>
      </div>
    </section>
  );
}
