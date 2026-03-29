import JobWageReportManualSection from "./JobWageReportManualSection";

export default function AdminJobWageReportPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">구인 일당 리포트</h1>
      <p className="mb-6 text-sm text-slate-600">
        KST 달력 <strong>30일 구간</strong>(어제를 말일로 함) 동안의 신규 포지션을 한 번에 집계하고, 직종 1위·공고당 대표 일당 기준 시·도별 평균과 최고 일당을{" "}
        <strong>리포트 1건</strong>으로 저장합니다. Cron을 쓰지 않을 때는 아래에서 수동 실행하세요.
      </p>
      <JobWageReportManualSection />
    </div>
  );
}
