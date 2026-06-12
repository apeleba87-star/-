import RegionHubBridgeCard from "@/components/region-hub/RegionHubBridgeCard";
import { jobWageReportHref, type JobWageHubTeaser } from "@/lib/report/job-wage-hub-teaser";
import { JOB_WAGE_HUB_CTA_LABEL, jobWageHubSlimDetail, jobWageHubSlimHook } from "@/lib/report/job-wage-hub-copy";

type Props = {
  teaser: JobWageHubTeaser;
};

/** 지역 미선택 시 — 펄스 아래 당일 시세 슬림 진입 */
export default function DemandHubJobWageSlimLink({ teaser }: Props) {
  const href = jobWageReportHref(teaser.reportDate);

  return (
    <RegionHubBridgeCard
      tone="teal"
      kicker="일당"
      headline={jobWageHubSlimHook()}
      detail={jobWageHubSlimDetail(teaser.excerpt, teaser.dominantCategory)}
      href={href}
      cta={JOB_WAGE_HUB_CTA_LABEL}
      ariaLabel="오늘 일당 시세 보기"
      compact
    />
  );
}
