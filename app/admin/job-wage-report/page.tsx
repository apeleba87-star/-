import JobWageReportManualSection from "./JobWageReportManualSection";

export default function AdminJobWageReportPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">구인 일당 리포트</h1>
      <p className="mb-6 text-sm text-slate-600">
        전일 신규 포지션·직종 1위·공고당 대표 일당 기준 시·도별 평균과 최고 일당을 스냅샷으로 저장합니다. 자동 Cron은 설정하지 않은 경우 아래에서 수동 실행하세요.
      </p>
      <JobWageReportManualSection />
    </div>
  );
}
