import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, TrendingUp } from "lucide-react";
import {
  parseReportCardHeroFromExcerpt,
  reportCardGradientIndex,
  type ReportCardHeroMetrics,
} from "@/lib/news/parseReportCardHero";
import NewsCardFooterShare from "@/components/news/NewsCardFooterShare";
import type { NewsCardFooterShareConfig } from "@/components/news/NewsCardFooterShare";

const REPORT_HERO_GRADIENTS = [
  "from-teal-100/95 via-emerald-50/90 to-cyan-100/80",
  "from-emerald-100/95 via-teal-50/90 to-green-100/80",
  "from-cyan-100/90 via-sky-50/85 to-teal-100/85",
  "from-teal-50/95 via-cyan-100/80 to-emerald-100/85",
  "from-green-100/90 via-emerald-50/90 to-teal-100/85",
] as const;

const REPORT_HERO_OVERLAYS = [
  "from-teal-500/12 to-emerald-500/8",
  "from-emerald-500/12 to-teal-500/8",
  "from-cyan-500/10 to-teal-500/10",
  "from-teal-400/10 to-cyan-500/10",
  "from-green-500/10 to-emerald-500/10",
] as const;

type Props = {
  href: string;
  title: string;
  excerpt?: string | null;
  date: string;
  categoryTag?: string | null;
  /** 입찰·리포트 탭: excerpt 기반 상단 미니 요약 */
  reportHero?: boolean;
  /** 지표가 없을 때 히어로 제목 (기본: 당일 요약). 낙찰 리포트 등은 "한눈에 보기" 권장 */
  reportHeroFallbackTitle?: string;
  /** 본문(h2 아래) excerpt 숨김 — 히어로에만 요약 표시 */
  suppressBodyExcerpt?: boolean;
  /** 마케팅·일당 등: payload에서 뽑은 지표(지정 시 excerpt 파싱보다 우선) */
  heroMetrics?: ReportCardHeroMetrics | null;
  /** 그라데이션 구분용 (보통 published_at ISO) */
  accentSeed?: string | null;
  /** 리포트 탭: 배지 색 구분(입찰·낙찰·기타 스냅샷). 없으면 기존 흰 배지 */
  reportBadgeKind?: "daily" | "award" | "snapshot" | null;
  /** 카드 푸터 왼쪽: 우리 팀 공유(리포트·입찰 글) */
  footerShare?: NewsCardFooterShareConfig | null;
};

const REPORT_BADGE_TONE: Record<"daily" | "award" | "snapshot", string> = {
  daily: "bg-teal-50/95 text-teal-800 ring-1 ring-teal-200/75",
  award: "bg-violet-50/95 text-violet-800 ring-1 ring-violet-200/75",
  snapshot: "bg-amber-50/95 text-amber-900 ring-1 ring-amber-200/70",
};

export default function NewsCard({
  href,
  title,
  excerpt,
  date,
  categoryTag = null,
  reportHero = false,
  reportHeroFallbackTitle = "당일 요약",
  suppressBodyExcerpt = false,
  heroMetrics = null,
  accentSeed = null,
  reportBadgeKind = null,
  footerShare = null,
}: Props) {
  const fromExcerpt =
    reportHero && heroMetrics == null ? parseReportCardHeroFromExcerpt(excerpt) : null;
  const hasMarketingTwoLine =
    Boolean(heroMetrics?.primaryKeywordLine && heroMetrics?.primaryStatusLine);
  const hero =
    reportHero && heroMetrics != null
      ? {
          count:
            hasMarketingTwoLine || heroMetrics.primaryLine != null
              ? null
              : (heroMetrics.value ?? null),
          primaryLine: heroMetrics.primaryLine ?? null,
          primaryKeywordLine: heroMetrics.primaryKeywordLine ?? null,
          primaryStatusLine: heroMetrics.primaryStatusLine ?? null,
          countSuffix: heroMetrics.suffix ?? "건",
          subtitle: heroMetrics.subtitle ?? null,
          trendSummary: heroMetrics.trendSummary ?? null,
        }
      : reportHero
        ? {
            count: fromExcerpt?.count ?? null,
            primaryLine: null,
            primaryKeywordLine: null,
            primaryStatusLine: null,
            countSuffix: "건",
            subtitle: fromExcerpt?.subtitle ?? null,
            trendSummary: null,
          }
        : null;
  const gradIdx = reportHero
    ? reportCardGradientIndex((accentSeed ?? date ?? href).trim() || "0")
    : 0;
  const showDataHero = Boolean(reportHero && hero);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
      <Link
        href={href}
        className="flex min-h-0 flex-1 flex-col outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-teal-500/40"
      >
        {showDataHero ? (
          <div
            className={`relative h-48 overflow-hidden bg-gradient-to-br ${REPORT_HERO_GRADIENTS[gradIdx]}`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${REPORT_HERO_OVERLAYS[gradIdx]} transition-transform duration-300 group-hover:scale-105`}
              aria-hidden
            />
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/25 blur-2xl" aria-hidden />
            <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-teal-300/20 blur-2xl" aria-hidden />
            <div
              className="absolute -right-4 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-white/20 blur-xl"
              aria-hidden
            />

            {hero!.count != null && (
              <div
                className="pointer-events-none absolute -bottom-3 -right-1 select-none tabular-nums text-[5.25rem] font-black leading-none tracking-tighter text-teal-900/[0.09] sm:text-[5.75rem]"
                aria-hidden
              >
                {hero!.count.toLocaleString()}
              </div>
            )}

            <div className="relative z-10 flex h-full flex-col justify-between p-5">
              <div
                className={
                  hero!.primaryKeywordLine ||
                  hero!.primaryStatusLine ||
                  hero!.primaryLine ||
                  hero!.count != null
                    ? "min-w-0 max-w-[90%] sm:max-w-[85%]"
                    : "min-w-0"
                }
              >
                <div className="flex items-center gap-1.5 text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-teal-700/90" aria-hidden />
                  <span className="text-xs font-semibold tracking-tight">{date}</span>
                </div>

                {hero!.primaryKeywordLine && hero!.primaryStatusLine ? (
                  <div className="mt-3.5 flex items-start gap-2">
                    <TrendingUp className="mt-1 h-5 w-5 shrink-0 text-teal-700/95 sm:h-6 sm:w-6" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-2xl font-extrabold leading-snug tracking-tight text-slate-900 sm:text-[1.65rem]">
                        {hero!.primaryKeywordLine}
                      </p>
                      <p className="mt-1.5 text-sm font-semibold leading-snug tracking-tight text-slate-600 sm:text-[0.9375rem]">
                        {hero!.primaryStatusLine}
                      </p>
                    </div>
                  </div>
                ) : hero!.primaryLine ? (
                  <div className="mt-3.5 flex items-start gap-2">
                    <TrendingUp className="mt-0.5 h-6 w-6 shrink-0 text-teal-700/95" aria-hidden />
                    <p className="min-w-0 text-2xl font-extrabold leading-snug tracking-tight text-slate-900 sm:text-[1.7rem]">
                      {hero!.primaryLine}
                    </p>
                  </div>
                ) : hero!.count != null ? (
                  <div className="mt-3.5 flex flex-wrap items-end gap-x-2 gap-y-1">
                    <FileText
                      className="mb-1.5 h-6 w-6 shrink-0 text-teal-700/95"
                      aria-hidden
                    />
                    <span className="text-4xl font-extrabold tabular-nums leading-none text-slate-900 sm:text-[2.75rem]">
                      {hero!.count.toLocaleString()}
                    </span>
                    <span className="mb-1 text-base font-bold tracking-tight text-slate-600">{hero!.countSuffix}</span>
                  </div>
                ) : (
                  <p className="mt-4 text-lg font-bold leading-snug text-slate-800">{reportHeroFallbackTitle}</p>
                )}

                {hero!.trendSummary ? (
                  <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-[13px] font-medium leading-relaxed">
                    <span className="font-semibold text-red-600">
                      급상승 {hero!.trendSummary.rising}
                    </span>
                    <span className="text-slate-400" aria-hidden>
                      ·
                    </span>
                    <span className="font-semibold text-blue-600">
                      급하락 {hero!.trendSummary.falling}
                    </span>
                    <span className="text-slate-400" aria-hidden>
                      ·
                    </span>
                    <span className="font-medium text-slate-600/95">
                      안정 {hero!.trendSummary.stable}
                    </span>
                  </p>
                ) : hero!.subtitle ? (
                  <p className="mt-2.5 line-clamp-2 text-[13px] font-medium leading-relaxed text-slate-600/95">
                    {hero!.subtitle}
                  </p>
                ) : excerpt &&
                  hero!.count == null &&
                  !hero!.primaryLine &&
                  !(hero!.primaryKeywordLine && hero!.primaryStatusLine) ? (
                  <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                    {excerpt}
                  </p>
                ) : null}
              </div>

              {categoryTag && (
                <span
                  className={
                    reportBadgeKind
                      ? `mt-3 inline-flex max-w-full self-start rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm ${REPORT_BADGE_TONE[reportBadgeKind]}`
                      : "mt-3 inline-flex max-w-full self-start rounded-xl bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-white/60 backdrop-blur-sm"
                  }
                >
                  {categoryTag}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-50 via-teal-50/80 to-emerald-50/80">
            <div
              className="absolute inset-0 bg-gradient-to-br from-teal-400/10 to-emerald-500/10 transition-transform duration-300 group-hover:scale-110"
              aria-hidden
            />
            {categoryTag && (
              <span
                className={
                  reportBadgeKind
                    ? `absolute bottom-3 left-3 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm ${REPORT_BADGE_TONE[reportBadgeKind]}`
                    : "absolute bottom-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm"
                }
              >
                {categoryTag}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col p-4">
          <h2 className="line-clamp-2 font-bold text-slate-800 transition-colors duration-300 group-hover:text-teal-700">
            {title}
          </h2>
          {excerpt && !suppressBodyExcerpt && (
            <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
              {excerpt}
            </p>
          )}
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 pb-4 pt-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          {footerShare ? <NewsCardFooterShare config={footerShare} /> : null}
          {(!reportHero || !showDataHero) && (
            <time className="text-xs text-slate-500">{date}</time>
          )}
        </div>
        <Link
          href={href}
          className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-teal-600 transition-all duration-300 hover:gap-1.5"
        >
          자세히 보기
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
