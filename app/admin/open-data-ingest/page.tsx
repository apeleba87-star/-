import WorknetIngestPanel from "./WorknetIngestPanel";

export default function AdminOpenDataIngestPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">워크넷 일자리 수집</h1>
      <p className="mb-6 text-sm text-slate-600">
        고용24(워크넷) 채용정보만 수집합니다. 서울 열린데이터 GetJobInfo 수집은 사용하지 않습니다.
      </p>
      <WorknetIngestPanel />
    </div>
  );
}