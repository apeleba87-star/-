import DemandKeywordIngestPanel from "./DemandKeywordIngestPanel";
import DemandRtmsBackfillPanel from "./DemandRtmsBackfillPanel";
import DemandRtmsDealsIngestPanel from "./DemandRtmsDealsIngestPanel";
import DemandRtmsIngestPanel from "./DemandRtmsIngestPanel";
import WorknetIngestPanel from "./WorknetIngestPanel";

export default function AdminOpenDataIngestPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">데이터 수집</h1>
      <p className="mb-6 text-sm text-slate-600">
        이사검색 실거래 원자료, 입주레이더(RTMS·키워드), 공공 일자리(워크넷) 수집 작업을 수동 실행할 수 있습니다.
      </p>
      <DemandRtmsDealsIngestPanel />
      <DemandRtmsIngestPanel />
      <DemandRtmsBackfillPanel />
      <DemandKeywordIngestPanel />
      <WorknetIngestPanel />
    </div>
  );
}