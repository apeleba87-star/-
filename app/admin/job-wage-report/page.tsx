import JobWageReportManualSection from "./JobWageReportManualSection";

export default function AdminJobWageReportPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">구인 일당 리포트</h1>
      <p className="mb-6 text-sm text-slate-600">
        <strong>30일</strong>: 어제를 말일로 한 달력 30일 구간. <strong>당일</strong>: KST 오늘 하루만 집계(입주레이더 허브·크론 기본). 크론은 KST 9·13·17·21시에 당일 리포트를 갱신합니다.{" "}
        <strong>말일 날짜(report_date)당 1행</strong>으로 저장합니다(같은 날 재실행 시 그 행만 갱신). Cron을 쓰지 않을 때는 아래에서 수동 실행하세요.
      </p>
      <JobWageReportManualSection />
    </div>
  );
}
