import JobWageReportDemandBridge from "@/components/region-hub/JobWageReportDemandBridge";
import JobWageReportJobsBridge from "@/components/region-hub/JobWageReportJobsBridge";

type Props = {
  highlightProvince?: string | null;
};

/** 일당 리포트 — 입주·채용 슬림 브릿지 묶음 */
export default async function JobWageReportRegionHubBridges({ highlightProvince }: Props) {
  return (
    <div className="space-y-2">
      <JobWageReportDemandBridge highlightProvince={highlightProvince} />
      <JobWageReportJobsBridge highlightProvince={highlightProvince} />
    </div>
  );
}
