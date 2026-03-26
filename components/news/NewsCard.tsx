import Link from "next/link";
import { ArrowRight, CalendarDays, FileText } from "lucide-react";
import {
  parseReportCardHeroFromExcerpt,
  reportCardGradientIndex,
} from "@/lib/news/parseReportCardHero";

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
  /** 그라데이션 구분용 (보통 published_at ISO) */
  accentSeed?: string | null;
};

export default function NewsCard({
  href,
  title,
  excerpt,
  date,
  categoryTag = null,
  reportHero = false,
  accentSeed = null,
}: Props) {
  const parsed = reportHero ? parseReportCardHeroFromExcerpt(excerpt) : null;
  const gradIdx = reportHero
    ? reportCardGradientIndex((accentSeed ?? date ?? href).trim() || "0")
    : 0;
  const showDataHero = reportHero && parsed !== null;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
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

          {parsed!.count != null && (
            <div
              className="pointer-events-none absolute -bottom-3 -right-1 select-none tabular-nums text-[5.25rem] font-black leading-none tracking-tighter text-teal-900/[0.09] sm:text-[5.75rem]"
              aria-hidden
            >
              {parsed!.count.toLocaleString()}
            </div>
          )}

          <div className="relative z-10 flex h-full flex-col justify-between p-5">
            <div
              className={
                parsed!.count != null
                  ? "min-w-0 max-w-[72%] sm:max-w-[68%]"
                  : "min-w-0"
              }
            >
              <div className="flex items-center gap-1.5 text-slate-600">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-teal-700/90" aria-hidden />
                <span className="text-xs font-semibold tracking-tight">{date}</span>
              </div>

              {parsed!.count != null ? (
                <div className="mt-3.5 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <FileText
                    className="mb-1.5 h-6 w-6 shrink-0 text-teal-700/95"
                    aria-hidden
                  />
                  <span className="text-4xl font-extrabold tabular-nums leading-none text-slate-900 sm:text-[2.75rem]">
                    {parsed!.count.toLocaleString()}
                  </span>
                  <span className="mb-1 text-base font-bold tracking-tight text-slate-600">건</span>
                </div>
              ) : (
                <p className="mt-4 text-lg font-bold leading-snug text-slate-800">당일 요약</p>
              )}

              {parsed!.subtitle ? (
                <p className="mt-2.5 line-clamp-2 text-[13px] font-medium leading-relaxed text-slate-600/95">
                  {parsed!.subtitle}
                </p>
              ) : excerpt && parsed!.count == null ? (
                <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                  {excerpt}
                </p>
              ) : null}
            </div>

            {categoryTag && (
              <span className="mt-3 inline-flex max-w-full self-start rounded-xl bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-white/60 backdrop-blur-sm">
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
            <span className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm">
              {categoryTag}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 font-bold text-slate-800 transition-colors duration-300 group-hover:text-teal-700">
          {title}
        </h2>
        {excerpt && (
          <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
            {excerpt}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <time className="text-xs text-slate-500">{date}</time>
          <span className="flex items-center gap-0.5 text-sm font-medium text-teal-600 transition-all duration-300 group-hover:gap-1.5">
            자세히 보기
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
