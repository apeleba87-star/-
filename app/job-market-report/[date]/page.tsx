import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, MapPin, TrendingDown, TrendingUp, Users } from "lucide-react";
import KoreaProvinceGeoMap from "@/components/jobs/KoreaProvinceGeoMap";
import JobWagePremiumInsights from "@/components/jobs/JobWagePremiumInsights";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { getKstDateString } from "@/lib/content/kst-utils";
import { addDaysToDateString } from "@/lib/jobs/kst-date";
import {
  JOB_WAGE_MAP_TOP_PROVINCES,
  JOB_WAGE_REPORT_WINDOW_DAYS,
  type JobWageDailyReportPayload,
} from "@/lib/jobs/job-wage-daily-report";
import { compareWeightedNationalAvg, provinceWeightedWageBins } from "@/lib/jobs/job-wage-premium-insights";
import { WAGE_MAP_RANK_META } from "@/lib/jobs/wage-map-rank-palette";
import {
  bottomProvinceFromProvinces,
  provincesFromPayload,
  topProvinceFromProvinces,
} from "@/lib/jobs/job-wage-report-display";
import { hasSubscriptionAccess } from "@/lib/subscription-access";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";

export const dynamic = "force-dynamic";

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

const cardClass =
  "rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm ring-1 ring-slate-100/80 sm:p-7";
const insightClass =
  "rounded-3xl border border-teal-200/80 bg-gradient-to-br from-teal-50/95 via-white to-emerald-50/40 p-6 shadow-md ring-1 ring-teal-100/60 sm:p-7";

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
  const prevReportDate = addDaysToDateString(date, -1);
  const [{ data: report, error }, { data: recent }, { data: prevReportRow }] = await Promise.all([
    supabase.from("job_wage_daily_reports").select("headline, payload, fetch_error").eq("report_date", date).maybeSingle(),
    supabase.from("job_wage_daily_reports").select("report_date").order("report_date", { ascending: false }).limit(30),
    supabase.from("job_wage_daily_reports").select("payload").eq("report_date", prevReportDate).maybeSingle(),
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
  const bottomProvince = payload?.bottomProvinceByAvgWage ?? bottomProvinceFromProvinces(provinces);

  const provinceByName = new Map(provinces.map((p) => [p.province, p]));

  const prevPayload = prevReportRow?.payload as unknown as JobWageDailyReportPayload | null;
  const prevHasPayload =
    prevPayload &&
    typeof prevPayload.methodologyNote === "string" &&
    typeof prevPayload.reportDateKst === "string" &&
    (Array.isArray(prevPayload.provinces) || Array.isArray(prevPayload.regions));
  const prevProvinces = prevHasPayload && prevPayload ? provincesFromPayload(prevPayload) : [];
  const nationalCompare = compareWeightedNationalAvg(provinces, prevProvinces);
  const wageBins = provinceWeightedWageBins(provinces);

  const todayKst = getKstDateString();
  let jobWageInsightUnlocked = isAdmin;
  if (!jobWageInsightUnlocked && user) {
    const { data: subRow } = await authSupabase
      .from("subscriptions")
      .select("status, next_billing_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (hasSubscriptionAccess(subRow as { status: string; next_billing_at?: string | null } | null, todayKst)) {
      jobWageInsightUnlocked = true;
    }
  }
  if (!jobWageInsightUnlocked && user) {
    const { data: shareGrant } = await authSupabase
      .from("report_share_grants")
      .select("id")
      .eq("user_id", user.id)
      .eq("grant_date", todayKst)
      .maybeSingle();
    jobWageInsightUnlocked = Boolean(shareGrant);
  }

  const jobWageShareTitle = `일당 리포트 ${date}`;
  const jobWageShareText =
    hasPayload && payload?.dominantCategory
      ? `「${payload.dominantCategory.name}」 일당 리포트 — 시·도별 평균 일당`
      : `구인 일당 리포트 ${date}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/80 via-white to-teal-50/50">
      <div className="page-shell py-10 lg:py-12">
        <div className="lg:text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700/90">구인 시장 스냅샷</p>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">일당 리포트</h1>
          <p className="mx-auto mb-2 max-w-2xl text-lg font-semibold leading-snug text-slate-800">{report.headline}</p>
          <p className="mx-auto mb-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-slate-100/90 px-4 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200/80">
            <span className="font-medium text-slate-500">집계 구간</span>
            <span className="font-semibold text-slate-800">{windowRangeLabel}</span>
          </p>
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
                <h2 className="text-xl font-bold text-teal-950">이 페이지를 이렇게 쓰세요</h2>
                <p className="mt-1 text-sm text-teal-900/70">숫자만 훑어도 되고, 아래 표에서 시·도별로 자세히 볼 수 있어요.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-teal-100/80">
                    <div className="flex items-center gap-2 text-teal-800">
                      <Users className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="font-bold">구직자</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      <strong className="text-slate-900">평균 일당이 높은 시·도</strong>는 같은 직종이라도 대표 일당이 높게 잡힌 구인이 많다는 뜻이고,{" "}
                      <strong className="text-slate-900">낮은 시·도</strong>는 반대로 이 직종 단가가 낮게 형성된 편이라는 신호입니다. 일할 지역을 고를 때 참고하세요. 실제 급여는 현장·계약마다 다릅니다.
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
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">대표 직종</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">지금 이 숫자가 말하는 직종</h2>
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

              {(topProvince || bottomProvince || payload.maxDailyWage || payload.minDailyWage) && (
                <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-md ring-1 ring-slate-100 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">요약</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">높음 · 낮음 한눈에</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    가로로 <strong className="text-slate-800">왼쪽은 가장 높음</strong>,{" "}
                    <strong className="text-slate-800">오른쪽은 가장 낮음</strong>입니다.
                  </p>

                  {(topProvince || bottomProvince) && (
                    <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="min-w-0 rounded-2xl border-2 border-teal-500 bg-white p-3 shadow-sm sm:p-5">
                        <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-teal-700 sm:text-xs">
                          평균 일당 · 가장 높은 시·도
                        </p>
                        {topProvince ? (
                          <>
                            <p className="mt-2 truncate text-lg font-black text-slate-900 sm:text-2xl">{topProvince.province}</p>
                            <p className="mt-1 text-base font-bold tabular-nums text-teal-800 sm:text-xl">{formatWon(topProvince.avgDailyWage)}</p>
                            <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">공고 {topProvince.jobPostCount}건 평균</p>
                          </>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">데이터 없음</p>
                        )}
                      </div>
                      <div className="min-w-0 rounded-2xl border-2 border-rose-300/90 bg-gradient-to-br from-rose-50/90 to-white p-3 shadow-sm ring-1 ring-rose-100 sm:p-5">
                        <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-rose-800 sm:text-xs">
                          평균 일당 · 가장 낮은 시·도
                        </p>
                        {bottomProvince ? (
                          <>
                            <p className="mt-2 truncate text-lg font-black text-slate-900 sm:text-2xl">{bottomProvince.province}</p>
                            <p className="mt-1 text-base font-bold tabular-nums text-rose-800 sm:text-xl">{formatWon(bottomProvince.avgDailyWage)}</p>
                            <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">공고 {bottomProvince.jobPostCount}건 평균</p>
                          </>
                        ) : (
                          <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
                            시·도가 한 곳뿐이면 평균을 나누어 비교할 수 없습니다.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {(payload.maxDailyWage || payload.minDailyWage) && (
                    <div className="mt-5 border-t border-slate-200/90 pt-5">
                      <p className="text-sm font-semibold text-slate-700">한 공고에 적힌 대표 일당</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-4">
                        <div className="min-w-0 rounded-2xl border-2 border-emerald-400/90 bg-gradient-to-br from-emerald-50 to-white p-3 shadow-sm ring-1 ring-emerald-100 sm:p-5">
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-900 sm:text-xs">
                            <TrendingUp className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                            가장 높은 일당
                          </div>
                          {payload.maxDailyWage ? (
                            <>
                              <p className="mt-2 text-lg font-bold tabular-nums text-emerald-800 sm:text-xl">{formatWon(payload.maxDailyWage.amount)}</p>
                              <p className="mt-2 flex items-start gap-1 text-xs font-medium leading-snug text-slate-800 sm:text-sm">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700/80 sm:h-4 sm:w-4" aria-hidden />
                                <span className="break-words">{payload.maxDailyWage.region}</span>
                              </p>
                            </>
                          ) : (
                            <p className="mt-3 text-xs text-slate-500 sm:text-sm">표시할 데이터가 없습니다.</p>
                          )}
                        </div>
                        <div className="min-w-0 rounded-2xl border-2 border-rose-400/90 bg-gradient-to-br from-rose-50 to-white p-3 shadow-sm ring-1 ring-rose-100 sm:p-5">
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose-900 sm:text-xs">
                            <TrendingDown className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                            가장 낮은 일당
                          </div>
                          {payload.minDailyWage ? (
                            <>
                              <p className="mt-2 text-lg font-bold tabular-nums text-rose-800 sm:text-xl">{formatWon(payload.minDailyWage.amount)}</p>
                              <p className="mt-2 flex items-start gap-1 text-xs font-medium leading-snug text-slate-800 sm:text-sm">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-700/80 sm:h-4 sm:w-4" aria-hidden />
                                <span className="break-words">{payload.minDailyWage.region}</span>
                              </p>
                            </>
                          ) : (
                            <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
                              이 구간에서 최저 일당을 골라 낼 수 없습니다.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {provinces.length > 0 && (
                <section className={cardClass}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">지역</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">시·도별 평균 일당 · 지도</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    상위 <strong className="text-slate-800">{JOB_WAGE_MAP_TOP_PROVINCES}곳</strong>은{" "}
                    <strong className="text-slate-800">1위~5위마다 서로 다른 색</strong>으로 칠해져 있고, 금액은 바로 아래 카드에서 확인하세요.
                    같은 직종·같은 집계 기간 안에서만 비교한 값입니다.
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

              {hasPayload && payload && provinces.some((p) => p.jobPostCount > 0) && (
                <JobWagePremiumInsights
                  reportDate={date}
                  loginNextPath={`/job-market-report/${date}`}
                  unlocked={jobWageInsightUnlocked}
                  shareTitle={jobWageShareTitle}
                  shareText={jobWageShareText}
                  compare={nationalCompare}
                  bins={wageBins}
                  dominantCategoryName={payload.dominantCategory?.name ?? null}
                  prevDominantCategoryName={prevHasPayload && prevPayload ? prevPayload.dominantCategory?.name ?? null : null}
                  hasPrevReport={Boolean(prevReportRow && prevHasPayload)}
                />
              )}

              <section className={cardClass}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">전체 목록</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">시·도 전체 표</h2>
                <p className="mt-2 text-sm text-slate-600">
                  공고 <strong className="text-slate-800">{payload.jobPostCount.toLocaleString("ko-KR")}곳</strong> 기준 · 평균 높은 순 · 상위
                  5곳은 지도 색과 같은 표식
                </p>
                {provinces.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">표시할 데이터가 없습니다.</p>
                ) : (
                  <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200/90 shadow-inner">
                    <table className="w-full min-w-[320px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/90 text-xs font-bold uppercase tracking-wide text-slate-600">
                          <th className="px-4 py-3.5 text-center">지도</th>
                          <th className="px-4 py-3.5">시·도</th>
                          <th className="px-4 py-3.5 text-right">평균 일당</th>
                          <th className="px-4 py-3.5 text-right">공고 수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {provinces.map((r, idx) => {
                          const mapRank =
                            idx < JOB_WAGE_MAP_TOP_PROVINCES && r.jobPostCount > 0 ? idx + 1 : null;
                          const rankColor =
                            mapRank != null ? WAGE_MAP_RANK_META[mapRank - 1]?.fill : null;
                          return (
                            <tr
                              key={r.province}
                              className={`border-b border-slate-100 last:border-0 ${
                                mapRank ? "bg-slate-50/50" : ""
                              } hover:bg-teal-50/50`}
                            >
                              <td className="px-4 py-3.5 text-center">
                                {mapRank && rankColor ? (
                                  <span
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold text-white shadow-sm"
                                    style={{ backgroundColor: rankColor }}
                                    title={`지도 ${mapRank}위 색`}
                                  >
                                    {mapRank}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-base font-semibold text-slate-900">{r.province}</td>
                              <td className="px-4 py-3.5 text-right text-base font-bold tabular-nums text-slate-900">
                                {formatWon(r.avgDailyWage)}
                              </td>
                              <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">{r.jobPostCount}곳</td>
                            </tr>
                          );
                        })}
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
