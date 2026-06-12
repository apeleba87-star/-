import type { ReactNode } from "react";

import { notFound } from "next/navigation";

import { MapPin, TrendingDown, TrendingUp } from "lucide-react";

import KoreaProvinceGeoMap from "@/components/jobs/KoreaProvinceGeoMap";

import { createClient, createServerSupabase } from "@/lib/supabase-server";

import { addDaysToDateString } from "@/lib/jobs/kst-date";

import {

  JOB_WAGE_MAP_TOP_PROVINCES,

  JOB_WAGE_REPORT_WINDOW_DAYS,

  type JobWageDailyReportPayload,

} from "@/lib/jobs/job-wage-daily-report";

import { formatJobWageDominantDisplayName, jobWageReportListExcerptFromPayload } from "@/lib/jobs/job-wage-dominant-label";

import {

  bottomProvinceFromProvinces,

  provincesFromPayload,

  resolveHighlightProvince,

  topProvinceFromProvinces,

} from "@/lib/jobs/job-wage-report-display";

import { getActiveReportPageAds, isAdSlotRenderable } from "@/lib/ads";

import AffiliateAdSlot from "@/components/ads/AffiliateAdSlot";

import { buildJobWageShareCopy, jobWageReportMetaDescription } from "@/lib/report/job-wage-share-copy";

import { buildPageMetadata } from "@/lib/seo";

import DemandRadarNationalAd from "@/components/demand/DemandRadarNationalAd";
import GuestPreviewGate from "@/components/auth/GuestPreviewGate";

import { formatReportLinkDate } from "@/lib/report/latest-report-dates";

import { isGuestLockedWage, redactJobWagePayloadForGuest } from "@/lib/report/guest-teaser-redact";

import ReportLoginRequiredInline from "@/components/report/ReportLoginRequiredInline";

import JobWageReportRegionHubBridges from "@/components/region-hub/JobWageReportRegionHubBridges";
import JobWageReportRecentDates from "@/components/jobs/JobWageReportRecentDates";
import JobWageReportShareButton from "@/components/jobs/JobWageReportShareButton";
import { getCachedJobsPublicHubTeaser } from "@/lib/region-hub/jobs-public-teaser-cache";
import type { JobWageSharePreview } from "@/lib/report/job-wage-share-copy";



export const dynamic = "force-dynamic";



function isYmd(s: string): boolean {

  return /^\d{4}-\d{2}-\d{2}$/.test(s);

}



function formatWon(n: number): string {

  return `${n.toLocaleString("ko-KR")}원`;

}



const cardClass =

  "rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm ring-1 ring-slate-100/80 sm:p-7";



function jobWageWindowLabel(windowDays: number, windowStartKst: string | null, reportDateKst: string): string {

  if (windowDays === 1) return `${formatReportLinkDate(reportDateKst)} 당일 신규 공고`;

  if (windowStartKst) return `${windowStartKst} ~ ${reportDateKst} (${windowDays}일)`;

  return `최근 ${windowDays}일`;

}



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



  const supabase = createClient();

  const { data: row } = await supabase

    .from("job_wage_daily_reports")

    .select("payload")

    .eq("report_date", date)

    .maybeSingle();



  const raw = row?.payload as JobWageDailyReportPayload | null;

  const provinces = raw ? provincesFromPayload(raw) : [];

  const top = topProvinceFromProvinces(provinces);

  const windowDays = raw?.windowDays ?? JOB_WAGE_REPORT_WINDOW_DAYS;

  const windowStartKst =

    raw?.windowStartKst ??

    (raw?.reportDateKst ? addDaysToDateString(raw.reportDateKst, -(windowDays - 1)) : null);

  const windowLabel =

    raw?.reportDateKst ? jobWageWindowLabel(windowDays, windowStartKst, raw.reportDateKst) : null;

  const dominantRaw = raw?.dominantCategory?.name?.trim() ?? null;



  const sharePreview = {

    reportDate: date,

    windowLabel,

    dominantCategory: dominantRaw ? formatJobWageDominantDisplayName(dominantRaw) : null,

    topProvince: top?.province ?? null,

    topAvgWon: top?.avgDailyWage ?? null,

    topJobPostCount: top?.jobPostCount ?? null,

  };



  const title = `${buildJobWageShareCopy(sharePreview).previewHeadline} | 일당 리포트`;

  return buildPageMetadata({

    title,

    description: jobWageReportMetaDescription(sharePreview),

    path: `/job-market-report/${date}`,

  });

}



export default async function JobMarketReportDatePage({

  params,

  searchParams,

}: {

  params: Promise<{ date: string }>;

  searchParams: Promise<{ province?: string }>;

}) {

  const { date } = await params;

  const { province: provinceQuery } = await searchParams;

  if (!isYmd(date)) notFound();



  const authSupabase = await createServerSupabase();

  const {

    data: { user },

  } = await authSupabase.auth.getUser();

  const supabase = createClient();

  const [{ data: report, error }, { data: recentRows }, reportAds, jobsPublicTeaser] =
    await Promise.all([
      supabase
        .from("job_wage_daily_reports")
        .select("headline, payload, fetch_error")
        .eq("report_date", date)
        .maybeSingle(),
      supabase
        .from("job_wage_daily_reports")
        .select("report_date, headline, payload")
        .neq("report_date", date)
        .order("report_date", { ascending: false })
        .limit(3),
      getActiveReportPageAds(),
      getCachedJobsPublicHubTeaser(),
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

  const highlightProvince = resolveHighlightProvince(provinceQuery, provinces);

  const topProvince = payload?.topProvinceByAvgWage ?? topProvinceFromProvinces(provinces);

  const bottomProvince = payload?.bottomProvinceByAvgWage ?? bottomProvinceFromProvinces(provinces);



  const provinceByName = new Map(provinces.map((p) => [p.province, p]));



  const showReportTopAd = Boolean(user) && isAdSlotRenderable(reportAds.report_top);

  const jobWageDominantDisplay =
    hasPayload && payload?.dominantCategory?.name?.trim()
      ? formatJobWageDominantDisplayName(payload.dominantCategory.name.trim())
      : "";

  const windowLabel =
    hasPayload && payload
      ? jobWageWindowLabel(windowDays, windowStartKst, payload.reportDateKst)
      : null;

  const jobWageSharePreview: JobWageSharePreview = {
    reportDate: date,
    windowLabel,
    dominantCategory: jobWageDominantDisplay || null,
    topProvince: topProvince?.province ?? null,
    topAvgWon:
      topProvince && !isGuestLockedWage(topProvince.avgDailyWage) ? topProvince.avgDailyWage : null,
    topJobPostCount:
      topProvince && !isGuestLockedWage(topProvince.avgDailyWage) ? topProvince.jobPostCount : null,
  };

  const showSinglePostingWages = Boolean(user) && Boolean(payload?.maxDailyWage || payload?.minDailyWage);



  return (

    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100/80 via-white to-teal-50/50">

      <div

        className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-gradient-to-b from-teal-200/25 via-emerald-100/20 to-transparent blur-3xl"

        aria-hidden

      />

      <div className="page-shell relative py-8 lg:py-10">

        <div className="relative mx-auto max-w-4xl pr-14 sm:pr-16">
          <div className="absolute right-0 top-0">
            <JobWageReportShareButton preview={jobWageSharePreview} />
          </div>
          <div className="lg:text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              일당 리포트 · {formatReportLinkDate(date)}
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-base font-semibold leading-snug text-slate-800">
              {jobWageReportListExcerptFromPayload(report.payload, report.headline)}
            </p>
          </div>
        </div>



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

          <div className="mx-auto mt-6 max-w-4xl space-y-6">

            {showReportTopAd ? (

              <AffiliateAdSlot slot={reportAds.report_top} variant="banner" className="mb-2" />

            ) : null}

            {!hasPayload || !payload ? (

              <div className={`${cardClass} text-center text-slate-600`}>리포트 데이터 형식을 읽을 수 없습니다.</div>

            ) : (

              <>

                {(topProvince || bottomProvince) && (

                  <section className={cardClass}>

                    <SectionHeader

                      icon={TrendingUp}

                      kicker="요약"

                      title="높음 · 낮음 한눈에"

                      description="시·도별 평균 일당 기준으로 가장 높은 곳과 낮은 곳입니다."

                      iconBg="bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25"

                    />



                    <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-4">

                      <div className="min-w-0 rounded-2xl border-2 border-teal-500 bg-white p-3 shadow-sm sm:p-5">

                        <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-teal-700 sm:text-xs">

                          평균 일당 · 가장 높은 시·도

                        </p>

                        {topProvince ? (

                          <>

                            <p className="mt-2 truncate text-lg font-black text-slate-900 sm:text-2xl">

                              {topProvince.province}

                            </p>

                            <p className="mt-1 text-base font-bold tabular-nums text-teal-800 sm:text-xl">

                              {isGuestLockedWage(topProvince.avgDailyWage) ? (

                                <ReportLoginRequiredInline loginNext={`/job-market-report/${date}`} />

                              ) : (

                                formatWon(topProvince.avgDailyWage)

                              )}

                            </p>

                            {!isGuestLockedWage(topProvince.avgDailyWage) ? (

                              <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">

                                공고 {topProvince.jobPostCount}건 평균

                              </p>

                            ) : null}

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

                            <p className="mt-2 truncate text-lg font-black text-slate-900 sm:text-2xl">

                              {bottomProvince.province}

                            </p>

                            <p className="mt-1 text-base font-bold tabular-nums text-rose-800 sm:text-xl">

                              {isGuestLockedWage(bottomProvince.avgDailyWage) ? (

                                <ReportLoginRequiredInline loginNext={`/job-market-report/${date}`} />

                              ) : (

                                formatWon(bottomProvince.avgDailyWage)

                              )}

                            </p>

                            {!isGuestLockedWage(bottomProvince.avgDailyWage) ? (

                              <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">

                                공고 {bottomProvince.jobPostCount}건 평균

                              </p>

                            ) : null}

                          </>

                        ) : (

                          <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm">

                            시·도가 한 곳뿐이면 평균을 나누어 비교할 수 없습니다.

                          </p>

                        )}

                      </div>

                    </div>



                    {showSinglePostingWages ? (

                      <div className="mt-6 border-t border-slate-200/90 pt-6">

                        <p className="text-sm font-semibold text-slate-700">한 공고에 적힌 대표 일당</p>

                        <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-4">

                          <div className="min-w-0 rounded-2xl border-2 border-emerald-400/90 bg-gradient-to-br from-emerald-50 to-white p-3 shadow-sm ring-1 ring-emerald-100 sm:p-5">

                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-900 sm:text-xs">

                              <TrendingUp className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />

                              가장 높은 일당

                            </div>

                            {payload.maxDailyWage ? (

                              <>

                                <p className="mt-2 text-lg font-bold tabular-nums text-emerald-800 sm:text-xl">

                                  {formatWon(payload.maxDailyWage.amount)}

                                </p>

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

                                <p className="mt-2 text-lg font-bold tabular-nums text-rose-800 sm:text-xl">

                                  {formatWon(payload.minDailyWage.amount)}

                                </p>

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

                    ) : null}

                  </section>

                )}

                <DemandRadarNationalAd className="my-1" />

                {provinces.length > 0 && (

                  <section className={cardClass}>

                    <KoreaProvinceGeoMap

                      provinceByName={provinceByName}

                      highlightTopN={JOB_WAGE_MAP_TOP_PROVINCES}

                      focusProvince={highlightProvince}

                    />

                    {provinces.some((p) => p.province === "기타" && p.jobPostCount > 0) && (

                      <p className="mt-4 rounded-lg bg-amber-50/90 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200/80">

                        <strong>기타</strong> 지역은 시·도를 알 수 없거나 형식이 다른 공고입니다. 위 지도에는 빠지고 집계에는 포함됩니다.

                      </p>

                    )}

                    <div className="mt-4">

                      <JobWageReportRegionHubBridges

                        jobsTeaser={jobsPublicTeaser}

                        highlightProvince={highlightProvince}

                      />

                    </div>

                  </section>

                )}

              </>

            )}

            <JobWageReportRecentDates
              rows={recentRows ?? []}
              provinceQuery={highlightProvince ?? provinceQuery}
            />
          </div>

        </GuestPreviewGate>

      </div>

    </div>

  );

}


