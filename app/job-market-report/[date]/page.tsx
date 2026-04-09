import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, MapPin, Table2, Tag, TrendingDown, TrendingUp } from "lucide-react";
import KoreaProvinceGeoMap from "@/components/jobs/KoreaProvinceGeoMap";
import JobWagePremiumInsights from "@/components/jobs/JobWagePremiumInsights";
import JobWageProvinceTableCopyButton from "@/components/jobs/JobWageProvinceTableCopyButton";
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
import ReportNextStep from "@/components/report/ReportNextStep";
import ReportTeamShareButton from "@/components/report/ReportTeamShareButton";
import { formatJobWageDominantDisplayName, jobWageReportListExcerptFromPayload } from "@/lib/jobs/job-wage-dominant-label";
import {
  bottomProvinceFromProvinces,
  provincesFromPayload,
  topProvinceFromProvinces,
} from "@/lib/jobs/job-wage-report-display";
import { hasSubscriptionAccess } from "@/lib/subscription-access";
import { jobWageTeamShareText } from "@/lib/report/team-share-messages";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";
import GuestPreviewGate from "@/components/auth/GuestPreviewGate";
import RelatedReportsSection from "@/components/report/RelatedReportsSection";
import { getCrossReportDiscoveryPosts } from "@/lib/content/related-report-posts";
import { isGuestLockedWage, redactJobWagePayloadForGuest } from "@/lib/report/guest-teaser-redact";
import ReportLoginRequiredInline from "@/components/report/ReportLoginRequiredInline";

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

function SectionHeader({
  icon: Icon,
  kicker,
  title,
  description,
  iconBg,
}: {
  icon: typeof MapPin;
  kicker: string;
  title: string;
  description?: ReactNode;
  iconBg: string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${iconBg}`}
      >
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{kicker}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p> : null}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isYmd(date)) return { title: "구인 일당 리포트" };
  return {
    title: `구인 일당 리포트 ${date} | 일당 리포트`,
    description: "구인 신규 포지션 기준 시·도별 평균 일당과 지역 안내",
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
  const [{ data: report, error }, { data: recent }, { data: prevReportRow }, crossPosts] = await Promise.all([
    supabase.from("job_wage_daily_reports").select("headline, payload, fetch_error").eq("report_date", date).maybeSingle(),
    supabase.from("job_wage_daily_reports").select("report_date").order("report_date", { ascending: false }).limit(365),
    supabase
      .from("job_wage_daily_reports")
      .select("report_date, payload")
      .lt("report_date", date)
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getCrossReportDiscoveryPosts(supabase, 4),
  ]);

  if (error || !report) notFound();

  const rawPayload = report.payload as unknown as JobWageDailyReportPayload | null;
  const payload =
    rawPayload && user ? rawPayload : rawPayload ? redactJobWagePayloadForGuest(rawPayload) : null;
  const hasPayload =
    payload &&
    typeof payload.methodologyNote === "string" &&
    typeof payload.reportDateKst === "string" &&
    (Array.isArray(payload.provinces) || Array.isArray(payload.regions));

  const windowDays = payload?.windowDays ?? JOB_WAGE_REPORT_WINDOW_DAYS;
  const windowStartKst =
    payload?.windowStartKst ??
    (payload?.reportDateKst ? addDaysToDateString(payload.reportDateKst, -(windowDays - 1)) : null);

  const provinces = hasPayload && payload ? provincesFromPayload(payload) : [];
  const topProvince = payload?.topProvinceByAvgWage ?? topProvinceFromProvinces(provinces);
  const bottomProvince = payload?.bottomProvinceByAvgWage ?? bottomProvinceFromProvinces(provinces);

  const provinceByName = new Map(provinces.map((p) => [p.province, p]));

  const prevPayloadRaw = prevReportRow?.payload as unknown as JobWageDailyReportPayload | null;
  const prevPayload =
    prevPayloadRaw && !user ? redactJobWagePayloadForGuest(prevPayloadRaw) : prevPayloadRaw;
  const prevHasPayload =
    prevPayload &&
    typeof prevPayload.methodologyNote === "string" &&
    typeof prevPayload.reportDateKst === "string" &&
    (Array.isArray(prevPayload.provinces) || Array.isArray(prevPayload.regions));
  const prevProvinces = prevHasPayload && prevPayload ? provincesFromPayload(prevPayload) : [];
  const nationalCompare = compareWeightedNationalAvg(provinces, prevProvinces);
  const wageBins = provinceWeightedWageBins(provinces);
  /** 비로그인: 구간 레이블만 쓰고 수치는 UI에서 락 (일부 집계 유출 방지) */
  const premiumInsightsBins = !user ? provinceWeightedWageBins([]) : wageBins;
  const premiumInsightsCompare = !user
    ? { currAvg: null, prevAvg: null, delta: null, deltaPct: null }
    : nationalCompare;

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
  const jobWageShareText = jobWageTeamShareText(date);

  const provinceTableTsv =
    hasPayload && payload
      ? [
          ["지도", "시·도", "평균일당(원)", "공고수"].join("\t"),
          ...provinces.map((r, idx) => {
            const mapRank =
              idx < JOB_WAGE_MAP_TOP_PROVINCES && r.jobPostCount > 0 ? String(idx + 1) : "—";
            return [mapRank, r.province, String(r.avgDailyWage), String(r.jobPostCount)].join("\t");
          }),
        ].join("\n")
      : "";

  const jobWageDominantDisplay =
    hasPayload && payload?.dominantCategory?.name?.trim()
      ? formatJobWageDominantDisplayName(payload.dominantCategory.name.trim())
      : "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100/80 via-white to-teal-50/50">
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-gradient-to-b from-teal-200/25 via-emerald-100/20 to-transparent blur-3xl"
        aria-hidden
      />
      <div className="page-shell relative py-10 lg:py-12">
        <div className="lg:text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700/90">구인 시장 스냅샷</p>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">일당 리포트</h1>
          <p className="mx-auto mb-3 max-w-2xl text-lg font-semibold leading-snug text-slate-800">
            {jobWageReportListExcerptFromPayload(report.payload, report.headline)}
          </p>
        </div>

        <NewsCategoryTabs section="report" current="job_wage" showPrivateTab={isAdmin} />

        {report.fetch_error && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm ring-1 ring-amber-100">
            참고: {report.fetch_error}
          </div>
        )}

        <GuestPreviewGate
          isLoggedIn={!!user}
          loginNext={`/job-market-report/${date}`}
          tone="teal"
          layout={user ? "crop" : "full"}
        >
        <div className="mx-auto mt-8 max-w-4xl space-y-6">
          {!hasPayload || !payload ? (
            <div className={`${cardClass} text-center text-slate-600`}>리포트 데이터 형식을 읽을 수 없습니다.</div>
          ) : (
            <>
              {payload.dominantCategory && (
                <section className={cardClass}>
                  <SectionHeader
                    icon={Tag}
                    kicker="대표 직종"
                    title="지금 이 숫자가 말하는 직종"
                    description="아래 평균·지도·요약·표는 모두 이 직종의 신규 구인만 모아 계산했습니다."
                    iconBg="bg-gradient-to-br from-teal-600 to-emerald-600 shadow-teal-500/30"
                  />
                  <div className="relative mt-6 overflow-hidden rounded-2xl border border-teal-100/90 bg-gradient-to-b from-white to-teal-50/40 p-5 shadow-sm ring-1 ring-teal-100/60 sm:p-6">
                    <div
                      className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500"
                      aria-hidden
                    />
                    <p className="pt-1 text-3xl font-extrabold tracking-tight text-teal-900 sm:text-4xl">
                      {payload.dominantCategory.name}
                    </p>
                    <p className="mt-3 text-sm text-slate-600">
                      이 직종 신규 포지션 <strong className="text-slate-900">{payload.dominantCategory.positionCount.toLocaleString("ko-KR")}건</strong> · 전체
                      신규 포지션 <strong className="text-slate-900">{payload.totalNewPositionCount.toLocaleString("ko-KR")}건</strong> 중 가장 많았습니다.
                    </p>
                  </div>
                </section>
              )}

              {(topProvince ||
                bottomProvince ||
                payload.maxDailyWage ||
                payload.minDailyWage ||
                (!user && hasPayload)) && (
                <section className={cardClass}>
                  <SectionHeader
                    icon={TrendingUp}
                    kicker="요약"
                    title="높음 · 낮음 한눈에"
                    description={
                      <>
                        가로로 <strong className="font-semibold text-slate-800">왼쪽은 평균이 가장 높은 시·도</strong>,{" "}
                        <strong className="font-semibold text-slate-800">오른쪽은 가장 낮은 시·도</strong>입니다.
                        {!user && hasPayload ? (
                          <>
                            {" "}
                            <strong className="font-semibold text-slate-800">한 공고 기준 최고·최저 일당</strong>은 로그인 후 확인할 수 있습니다.
                          </>
                        ) : (payload.maxDailyWage || payload.minDailyWage) && !jobWageInsightUnlocked ? (
                          <>
                            {" "}
                            <strong className="font-semibold text-slate-800">공고 한 건 기준 최고·최저 일당과 지역</strong>은 우리 팀 공유 또는 구독 시 아래에 표시됩니다.
                          </>
                        ) : jobWageInsightUnlocked && (payload.maxDailyWage || payload.minDailyWage) ? (
                          <> 아래는 공고 한 건에 적힌 일당의 최고·최저입니다.</>
                        ) : null}
                      </>
                    }
                    iconBg="bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25"
                  />

                  {(topProvince || bottomProvince) && (
                    <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="min-w-0 rounded-2xl border-2 border-teal-500 bg-white p-3 shadow-sm sm:p-5">
                        <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-teal-700 sm:text-xs">
                          평균 일당 · 가장 높은 시·도
                        </p>
                        {topProvince ? (
                          <>
                            <p className="mt-2 truncate text-lg font-black text-slate-900 sm:text-2xl">{topProvince.province}</p>
                            <p className="mt-1 text-base font-bold tabular-nums text-teal-800 sm:text-xl">
                              {isGuestLockedWage(topProvince.avgDailyWage) ? (
                                <ReportLoginRequiredInline loginNext={`/job-market-report/${date}`} />
                              ) : (
                                formatWon(topProvince.avgDailyWage)
                              )}
                            </p>
                            <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">
                              공고{" "}
                              {isGuestLockedWage(topProvince.avgDailyWage) ? (
                                <ReportLoginRequiredInline loginNext={`/job-market-report/${date}`} className="text-[11px] sm:text-xs" />
                              ) : (
                                <>{topProvince.jobPostCount}건</>
                              )}{" "}
                              평균
                            </p>
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
                            <p className="mt-1 text-base font-bold tabular-nums text-rose-800 sm:text-xl">
                              {isGuestLockedWage(bottomProvince.avgDailyWage) ? (
                                <ReportLoginRequiredInline loginNext={`/job-market-report/${date}`} />
                              ) : (
                                formatWon(bottomProvince.avgDailyWage)
                              )}
                            </p>
                            <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">
                              공고{" "}
                              {isGuestLockedWage(bottomProvince.avgDailyWage) ? (
                                <ReportLoginRequiredInline loginNext={`/job-market-report/${date}`} className="text-[11px] sm:text-xs" />
                              ) : (
                                <>{bottomProvince.jobPostCount}건</>
                              )}{" "}
                              평균
                            </p>
                          </>
                        ) : (
                          <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
                            시·도가 한 곳뿐이면 평균을 나누어 비교할 수 없습니다.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {(user && !jobWageInsightUnlocked && (payload.maxDailyWage || payload.minDailyWage)) ||
                  (user && jobWageInsightUnlocked && (payload.maxDailyWage || payload.minDailyWage)) ||
                  (!user && hasPayload) ? (
                    <div className="mt-6 border-t border-slate-200/90 pt-6">
                      <p className="text-sm font-semibold text-slate-700">한 공고에 적힌 대표 일당</p>
                      {!user ? (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-4">
                          <div className="min-w-0 rounded-2xl border-2 border-emerald-400/90 bg-gradient-to-br from-emerald-50 to-white p-3 shadow-sm ring-1 ring-emerald-100 sm:p-5">
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-900 sm:text-xs">
                              <TrendingUp className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                              가장 높은 일당
                            </div>
                            <div className="mt-2">
                              <ReportLoginRequiredInline loginNext={`/job-market-report/${date}`} />
                            </div>
                            <div className="mt-2 flex items-start gap-1 text-xs font-medium leading-snug text-slate-800 sm:text-sm">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700/80 sm:h-4 sm:w-4" aria-hidden />
                              <ReportLoginRequiredInline loginNext={`/job-market-report/${date}`} className="text-xs" />
                            </div>
                          </div>
                          <div className="min-w-0 rounded-2xl border-2 border-rose-400/90 bg-gradient-to-br from-rose-50 to-white p-3 shadow-sm ring-1 ring-rose-100 sm:p-5">
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose-900 sm:text-xs">
                              <TrendingDown className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                              가장 낮은 일당
                            </div>
                            <div className="mt-2">
                              <ReportLoginRequiredInline loginNext={`/job-market-report/${date}`} />
                            </div>
                            <div className="mt-2 flex items-start gap-1 text-xs font-medium leading-snug text-slate-800 sm:text-sm">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-700/80 sm:h-4 sm:w-4" aria-hidden />
                              <ReportLoginRequiredInline loginNext={`/job-market-report/${date}`} className="text-xs" />
                            </div>
                          </div>
                        </div>
                      ) : !jobWageInsightUnlocked ? (
                        <div className="mt-3 rounded-2xl border border-dashed border-amber-200/90 bg-amber-50/60 p-4 sm:p-5">
                          <div className="flex items-start gap-2 text-sm text-amber-950">
                            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                            <p>
                              금액·지역(시·군·구)은 <strong>심화 인사이트와 동일하게</strong> 우리 팀 공유 또는 구독 시에만 표시됩니다. 위쪽「심화 인사이트」에서 우리 팀 공유하면 이 구간도 함께 열립니다.
                            </p>
                          </div>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  ) : null}
                </section>
              )}

              {provinces.length > 0 && (
                <section className={cardClass}>
                  <SectionHeader
                    icon={MapPin}
                    kicker="지역"
                    title="시·도별 평균 일당 · 지도"
                    description={
                      <>
                        상위 <strong className="font-semibold text-slate-800">{JOB_WAGE_MAP_TOP_PROVINCES}곳</strong>은{" "}
                        <strong className="font-semibold text-slate-800">1위~5위마다 서로 다른 색</strong>으로 칠해져 있고, 표의 뱃지와 색이 맞습니다. 같은 직종·같은 집계 기간 안에서만 비교한 값입니다.
                      </>
                    }
                    iconBg="bg-gradient-to-br from-cyan-600 to-teal-600 shadow-cyan-500/25"
                  />
                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/40 p-3 ring-1 ring-slate-100/80 sm:p-4">
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
                  guestTeaser={!user}
                  shareTitle={jobWageShareTitle}
                  shareText={jobWageShareText}
                  compare={premiumInsightsCompare}
                  bins={premiumInsightsBins}
                  dominantCategoryName={payload.dominantCategory?.name ?? null}
                  prevDominantCategoryName={prevHasPayload && prevPayload ? prevPayload.dominantCategory?.name ?? null : null}
                  hasPrevReport={Boolean(prevReportRow && prevHasPayload)}
                />
              )}

                <section className={cardClass}>
                  <SectionHeader
                    icon={Table2}
                    kicker="전체 목록"
                    title="시·도 전체 표"
                    description={
                      <>
                        공고 <strong className="font-semibold text-slate-900">{payload.jobPostCount.toLocaleString("ko-KR")}곳</strong> 기준 · 평균 높은 순 · 상위
                        5곳은 지도와 같은 색 뱃지
                        {!jobWageInsightUnlocked ? (
                          <> · 표 전체 복사는 우리 팀 공유 또는 구독 시 사용할 수 있습니다.</>
                        ) : null}
                      </>
                    }
                    iconBg="bg-gradient-to-br from-slate-600 to-slate-800 shadow-slate-500/20"
                  />
                  {jobWageInsightUnlocked && provinces.length > 0 ? (
                    <div className="mt-4 flex justify-end">
                      <JobWageProvinceTableCopyButton tsv={provinceTableTsv} />
                    </div>
                  ) : null}
                {provinces.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">표시할 데이터가 없습니다.</p>
                ) : (
                  <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-inner ring-1 ring-slate-100/80">
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
                                {isGuestLockedWage(r.avgDailyWage) ? (
                                  <ReportLoginRequiredInline loginNext={`/job-market-report/${date}`} />
                                ) : (
                                  formatWon(r.avgDailyWage)
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">
                                {isGuestLockedWage(r.avgDailyWage) ? (
                                  <ReportLoginRequiredInline loginNext={`/job-market-report/${date}`} className="text-sm" />
                                ) : (
                                  `${r.jobPostCount}곳`
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {crossPosts.length > 0 ? (
            <RelatedReportsSection
              posts={crossPosts}
              title="입찰·낙찰 등 업계 리포트"
              description="데이터랩에 발행된 최근 글입니다. 유형이 섞여 있도록 골랐습니다."
              sectionHeadingId="job-wage-date-cross-reports"
            />
          ) : null}

          {recent && recent.length > 0 ? (
            <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-sm ring-1 ring-slate-100/80 sm:p-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">다른 날짜 · 일당 스냅샷</h2>
              <p className="mt-1 text-xs text-slate-500">날짜를 눌러 해당일 일당 리포트로 이동합니다.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {recent.map((r) => (
                  <li key={r.report_date}>
                    <Link
                      href={`/job-market-report/${r.report_date}`}
                      className={`inline-flex min-h-9 items-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        r.report_date === date
                          ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20"
                          : "bg-slate-50 text-slate-700 ring-1 ring-slate-200/90 hover:bg-white hover:ring-teal-200/80"
                      }`}
                    >
                      {r.report_date}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasPayload && payload ? (
            <div className="mx-auto mt-6 max-w-2xl">
              <ReportNextStep
                variant="teal"
                situation={
                  jobWageDominantDisplay
                    ? `「${jobWageDominantDisplay}」 기준으로 시장 단가 감을 잡았다면, 입찰 쪽 흐름과 맞춰 보는 것이 좋습니다.`
                    : "일당 흐름을 본 뒤에는, 실제 입찰·예산 흐름과 비교해 보면 판단이 선명해집니다."
                }
                actionLabel="실제 입찰 가격 흐름 보기"
                href="/news?section=report&category=report"
              />
            </div>
          ) : null}

          {hasPayload && payload ? (
            <div className="mx-auto mt-6 max-w-2xl">
              <ReportTeamShareButton
                kind="job_wage"
                reportDate={date}
                shareTitle={jobWageShareTitle}
                shareText={jobWageShareText}
                loginNextPath={`/job-market-report/${date}`}
                layout="full"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap justify-center gap-3 pt-2 pb-4">
            <Link
              href="/jobs"
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
            >
              구인 공고 보기
            </Link>
            <Link
              href="/marketing-report"
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/40"
            >
              마케팅 리포트
            </Link>
            <Link
              href="/news?section=report&category=report"
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              입찰 리포트
            </Link>
          </div>
        </div>
        </GuestPreviewGate>
      </div>
    </div>
  );
}
