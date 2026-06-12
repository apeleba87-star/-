import JobWageReportDemandBridge from "@/components/region-hub/JobWageReportDemandBridge";
import JobWageReportJobsBridge from "@/components/region-hub/JobWageReportJobsBridge";
import type { JobsPublicHubTeaser } from "@/lib/region-hub/jobs-public-teaser";

type Props = {
  highlightProvince?: string | null;
  jobsTeaser: JobsPublicHubTeaser;
};

/** 일당 리포트 — 입주·채용 슬림 브릿지 묶음 */
export default function JobWageReportRegionHubBridges({
  highlightProvince,
  jobsTeaser,
}: Props) {
  return (
    <div className="space-y-2">
      <JobWageReportDemandBridge highlightProvince={highlightProvince} />
      <JobWageReportJobsBridge jobsTeaser={jobsTeaser} highlightProvince={highlightProvince} />
    </div>
  );
}
