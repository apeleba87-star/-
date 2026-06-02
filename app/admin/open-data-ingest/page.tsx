import WorknetIngestPanel from "./WorknetIngestPanel";
import DemandRtmsIngestPanel from "./DemandRtmsIngestPanel";

export default function AdminOpenDataIngestPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">공공데이터 수집</h1>
      <p className="mb-6 text-sm text-slate-600">
        운영 중인 공공데이터 수집 작업을 관리자 화면에서 수동 실행할 수 있습니다.
      </p>
      <DemandRtmsIngestPanel />
      <WorknetIngestPanel />
    </div>
  );
}