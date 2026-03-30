import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, MapPin, TrendingDown, TrendingUp, Users } from "lucide-react";
import KoreaProvinceGeoMap from "@/components/jobs/KoreaProvinceGeoMap";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { addDaysToDateString } from "@/lib/jobs/kst-date";
import {
  JOB_WAGE_MAP_TOP_PROVINCES,
  JOB_WAGE_REPORT_WINDOW_DAYS,
  type JobWageDailyReportPayload,
} from "@/lib/jobs/job-wage-daily-report";
import { provincesFromPayload, topProvinceFromProvinces } from "@/lib/jobs/job-wage-report-display";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";

export const dynamic = "force-dynamic";

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

const cardClass = "rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6";
const insightClass =
  "rounded-2xl border-2 border-teal-200/80 bg-gradient-to-br from-teal-50/90 to-white p-4 sm:p-5";

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isYmd(date)) return { title: "구인 일당 리포트" };
  return {
    title: `구인 일당 리포트 ${date} | 일당 리포트`,
    description: "최근 30일 신규 구인 기준 시·도별 평균 일당과 지역 안내",
  };
}

export default async function JobMarketReportDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isYmd(date)) notFound();

  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  const { data: profile } = user
    ? await authSupabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = profile?.role === "admin" || profile?.role === "editor";

  const supabase = createClient();
  const [{ data: report, error }, { data: recent }] = await Promise.all([
    supabase.from("job_wage_daily_reports").select("headline, payload, fetch_error").eq("report_date", date).maybeSingle(),
    supabase.from("job_wage_daily_reports").select("report_date").order("report_date", { ascending: false }).limit(30),
  ]);

  if (error || !report) notFound();

  const payload = report.payload as unknown as JobWageDailyReportPayload | null;
  const hasPayload =
    payload &&
    typeof payload.methodologyNote === "string" &&
    typeof payload.reportDateKst === "string" &&
    (Array.isArray(payload.provinces) || Array.isArray(payload.regions));

  const windowDays = payload?.windowDays ?? JOB_WAGE_REPORT_WINDOW_DAYS;
  const windowStartKst =
    payload?.windowStartKst ??
    (payload?.reportDateKst ? addDaysToDateString(payload.reportDateKst, -(windowDays - 1)) : null);
  const windowRangeLabel =
    windowStartKst && payload?.reportDateKst
      ? `${windowStartKst} ~ ${payload.reportDateKst} (KST, 최근 ${windowDays}일)`
      : `${date} (KST)`;

  const provinces = hasPayload && payload ? provincesFromPayload(payload) : [];
  const topProvince = payload?.topProvinceByAvgWage ?? topProvinceFromProvinces(provinces);

  const provinceByName = new Map(provinces.map((p) => [p.province, p]));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
      <div className="page-shell py-10 lg:py-12">
        <div className="lg:text-center">
          <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            일당 리포트
          </h1>
          <p className="mx-auto mb-1 max-w-2xl text-base font-semibold text-slate-800">{report.headline}</p>
          <p className="mx-auto mb-6 text-sm text-slate-600">집계 구간: {windowRangeLabel}</p>
        </div>

        <NewsCategoryTabs current="job_wage" showPrivateTab={isAdmin} />

        <p className="mx-auto mt-4 max-w-3xl text-center text-sm">
          <Link href="/job-market-report" className="font-medium text-teal-700 hover:underline">
            ← 목록으로
          </Link>
        </p>

        {report.fetch_error && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
            참고: {report.fetch_error}
          </div>
        )}

        <div className="mx-auto mt-8 max-w-4xl space-y-6">
          {!hasPayload || !payload ? (
            <div className={`${cardClass} text-center text-slate-600`}>리포트 데이터 형식을 읽을 수 없습니다.</div>
          ) : (
            <>
              <section className={insightClass}>
                <h2 className="text-lg font-bold text-teal-900">이 페이지를 이렇게 쓰세요</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/80 p-4 ring-1 ring-teal-100">
                    <div className="flex items-center gap-2 text-teal-800">
                      <Users className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="font-bold">구직자</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      <strong className="text-slate-900">평균 일당이 높은 시·도</strong>는 같은 직종이라도 대표 일당이 높게 잡힌 구인이 많다는 뜻입니다. 일할 지역을 고를 때 참고하세요. 실제 급여는 현장·계약마다 다릅니다.
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-4 ring-1 ring-teal-100">
                    <div className="flex items-center gap-2 text-teal-800">
                      <Briefcase className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="font-bold">구인자</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      <strong className="text-slate-900">시·도별 평균</strong>은 최근 한 달, 가장 많이 올라온 직종 한 가지로만 모은 숫자입니다. 우리 공고 단가가 시장 중간쯤인지 가늠하는 데 쓰면 됩니다.
                    </p>
                  </div>
                </div>
              </section>

              {payload.dominantCategory && (
                <section className={cardClass}>
                  <h2 className="text-lg font-bold text-slate-900">지금 이 숫자가 말하는 직종</h2>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight text-teal-800 sm:text-4xl">
                    {payload.dominantCategory.name}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    이 직종 신규 포지션 <strong>{payload.dominantCategory.positionCount.toLocaleString("ko-KR")}건</strong> · 전체
                    신규 포지션 <strong>{payload.totalNewPositionCount.toLocaleString("ko-KR")}건</strong> 중 가장 많았습니다.
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    아래 평균·지도·최고·최저는 모두 이 직종만 골라 계산했습니다.
                  </p>
                </section>
              )}

              {(topProvince || payload.maxDailyWage || payload.minDailyWage) && (
                <section className="grid gap-3 sm:grid-cols-3">
                  {topProvince && (
                    <div className="rounded-2xl border-2 border-teal-500 bg-white p-4 shadow-md sm:p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">평균 일당 가장 높은 시·도</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{topProvince.province}</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-teal-800">{formatWon(topProvince.avgDailyWage)}</p>
                      <p className="mt-2 text-xs text-slate-500">공고 {topProvince.jobPostCount}건 평균</p>
                    </div>
                  )}
                  {payload.maxDailyWage && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-800">
                        <TrendingUp className="h-4 w-4" aria-hidden />
                        가장 높은 일당(한 공고)
                      </div>
                      <p className="mt-2 text-xl font-bold tabular-nums text-emerald-800">{formatWon(payload.maxDailyWage.amount)}</p>
                      <p className="mt-2 flex items-start gap-1 text-sm font-medium leading-snug text-slate-800">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                        {payload.maxDailyWage.region}
                      </p>
                    </div>
                  )}
                  {payload.minDailyWage && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex items-center gap-1 text-xs font-semibold text-rose-800">
                        <TrendingDown className="h-4 w-4" aria-hidden />
                        가장 낮은 일당(한 공고)
                      </div>
                      <p className="mt-2 text-xl font-bold tabular-nums text-rose-800">{formatWon(payload.minDailyWage.amount)}</p>
                      <p className="mt-2 flex items-start gap-1 text-sm font-medium leading-snug text-slate-800">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                        {payload.minDailyWage.region}
                      </p>
                    </div>
                  )}
                </section>
              )}

              {provinces.length > 0 && (
                <section className={cardClass}>
                  <h2 className="text-lg font-bold text-slate-900">시·도별 평균 일당 — 지도(상위 {JOB_WAGE_MAP_TOP_PROVINCES})</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    평균 일당이 높은 시·도 <strong>{JOB_WAGE_MAP_TOP_PROVINCES}곳</strong>은 지도에서 색으로 강조하고, 금액은 아래 박스에만 표시합니다. 같은 직종·같은 기간 안에서만 비교한 값입니다.
                  </p>
                  <div className="mt-6">
                    <KoreaProvinceGeoMap provinceByName={provinceByName} highlightTopN={JOB_WAGE_MAP_TOP_PROVINCES} />
                  </div>
                  {provinces.some((p) => p.province === "기타" && p.jobPostCount > 0) && (
                    <p className="mt-4 rounded-lg bg-amber-50/90 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200/80">
                      <strong>기타</strong> 지역은 시·도를 알 수 없거나 형식이 다른 공고입니다. 위 지도에는 빠지고 표에는 포함됩니다.
                    </p>
                  )}
                </section>
              )}

              <section className={cardClass}>
                <h2 className="text-lg font-bold text-slate-900">시·도 전체 표</h2>
                <p className="mt-1 text-sm text-slate-600">
                  공고 <strong>{payload.jobPostCount.toLocaleString("ko-KR")}곳</strong> 기준 · 평균 높은 순
                </p>
                {provinces.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">표시할 데이터가 없습니다.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[280px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          <th className="px-4 py-3">시·도</th>
                          <th className="px-4 py-3 text-right">평균 일당</th>
                          <th className="px-4 py-3 text-right">공고 수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {provinces.map((r) => (
                          <tr key={r.province} className="border-b border-slate-100 last:border-0 hover:bg-teal-50/40">
                            <td className="px-4 py-3 font-semibold text-slate-900">{r.province}</td>
                            <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-teal-900">
                              {formatWon(r.avgDailyWage)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-600">{r.jobPostCount}곳</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <p className="text-xs leading-relaxed text-slate-500">{payload.methodologyNote}</p>
              {payload.window && (
                <p className="text-xs text-slate-400">
                  집계 구간(UTC): {payload.window.startUtc} ~ {payload.window.endExclusiveUtc}
                </p>
              )}
            </>
          )}

          {recent && recent.length > 0 && (
            <section className="border-t border-slate-200/80 pt-8">
              <h2 className="text-sm font-semibold text-slate-700">다른 리포트</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {recent.map((r) => (
                  <li key={r.report_date}>
                    <Link
                      href={`/job-market-report/${r.report_date}`}
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        r.report_date === date ? "bg-teal-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-50"
                      }`}
                    >
                      {r.report_date}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap gap-3 pb-4">
            <Link
              href="/jobs"
              className="inline-flex min-h-[48px] min-w-[160px] flex-1 items-center justify-center rounded-xl bg-slate-900 px-6 text-base font-semibold text-white hover:bg-slate-800 sm:flex-none"
            >
              구인 공고 보기
            </Link>
            <Link
              href="/marketing-report"
              className="inline-flex min-h-[48px] min-w-[160px] flex-1 items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-6 text-base font-semibold text-slate-800 hover:bg-slate-50 sm:flex-none"
            >
              마케팅 리포트
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
