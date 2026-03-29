import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { JobWageDailyReportPayload } from "@/lib/jobs/job-wage-daily-report";
import { glassCard } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isYmd(date)) return { title: "구인 일당 리포트" };
  return {
    title: `구인 일당 스냅샷 ${date} | 일당 리포트`,
    description: "전일 신규 구인 포지션 기준 시·도별 평균 일당",
  };
}

export default async function JobMarketReportDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isYmd(date)) notFound();

  const supabase = createClient();
  const [{ data: report, error }, { data: recent }] = await Promise.all([
    supabase.from("job_wage_daily_reports").select("headline, payload, fetch_error").eq("report_date", date).maybeSingle(),
    supabase.from("job_wage_daily_reports").select("report_date").order("report_date", { ascending: false }).limit(14),
  ]);

  if (error || !report) notFound();

  const payload = report.payload as unknown as JobWageDailyReportPayload | null;
  const hasPayload =
    payload &&
    typeof payload.methodologyNote === "string" &&
    typeof payload.reportDateKst === "string" &&
    Array.isArray(payload.regions);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/jobs" className="hover:text-slate-800">
          인력 구인
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">일당 리포트</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">구인 공고 · 일당 스냅샷</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{report.headline}</h1>
        <p className="mt-2 text-sm text-slate-500">기준일(KST): {date}</p>
        {report.fetch_error && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            참고: {report.fetch_error}
          </p>
        )}
      </header>

      {!hasPayload ? (
        <p className="text-slate-600">리포트 데이터 형식을 읽을 수 없습니다.</p>
      ) : (
        <>
          {payload.dominantCategory && (
            <section className={`${glassCard} mb-6 p-5 sm:p-6`}>
              <h2 className="text-sm font-semibold text-slate-800">어제 가장 많이 올라온 직종(대분류)</h2>
              <p className="mt-2 text-lg font-semibold text-slate-900">{payload.dominantCategory.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                신규 포지션 {payload.dominantCategory.positionCount}건 (전체 신규 {payload.totalNewPositionCount}건 중)
              </p>
              <p className="mt-3 text-xs text-slate-600">
                아래 평균·최고 일당은 이 직종에 한정합니다. 공고(현장)당 대표 일당은 해당 직종 포지션의 일당 환산액 중 최댓값입니다.
              </p>
            </section>
          )}

          <section className={`${glassCard} mb-6 p-5 sm:p-6`}>
            <h2 className="text-sm font-semibold text-slate-800">시·도별 평균 일당</h2>
            <p className="mt-1 text-xs text-slate-500">해당 기간 등록 공고 기준 · 분석에 포함된 현장 {payload.jobPostCount}곳</p>
            {payload.regions.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">표시할 데이터가 없습니다.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {payload.regions.map((r) => (
                  <li
                    key={r.region}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2"
                  >
                    <span className="font-medium text-slate-800">{r.region}</span>
                    <span className="text-sm text-slate-700">
                      평균 <span className="font-semibold tabular-nums">{formatWon(r.avgDailyWage)}</span>
                      <span className="ml-2 text-xs text-slate-500">({r.jobPostCount}곳)</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {payload.maxDailyWage && (
            <section className={`${glassCard} mb-6 p-5 sm:p-6`}>
              <h2 className="text-sm font-semibold text-slate-800">최고 일당</h2>
              <p className="mt-2 text-xl font-bold tabular-nums text-emerald-800">{formatWon(payload.maxDailyWage.amount)}</p>
              <p className="mt-1 text-sm text-slate-600">지역: {payload.maxDailyWage.region}</p>
              <p className="mt-2 text-xs text-slate-500">해당 기간 등록 공고 중, 대표 일당이 가장 높았던 한 건입니다.</p>
            </section>
          )}

          <p className="text-xs leading-relaxed text-slate-500">{payload.methodologyNote}</p>
          {payload.window && (
            <p className="mt-2 text-xs text-slate-400">
              집계 구간(UTC): {payload.window.startUtc} ~ {payload.window.endExclusiveUtc} (전일 KST 하루)
            </p>
          )}
        </>
      )}

      {recent && recent.length > 0 && (
        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-sm font-semibold text-slate-700">최근 스냅샷</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {recent.map((r) => (
              <li key={r.report_date}>
                <Link
                  href={`/job-market-report/${r.report_date}`}
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                    r.report_date === date ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {r.report_date}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/jobs"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
        >
          인력 구인 보기
        </Link>
        <Link
          href="/marketing-report"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          마케팅 리포트
        </Link>
      </div>
    </div>
  );
}
