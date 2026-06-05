import type { ReactNode } from "react";
import { DEMAND_PHASE0_BADGE } from "@/lib/demand/copy";
import { cn } from "@/lib/utils";
import DemandAdminNavGate from "@/components/demand/DemandAdminNavGate";
import DemandSearch from "@/components/demand/DemandSearch";
import DemandDisclaimer from "@/components/demand/DemandDisclaimer";
import { DEMAND_SNAPSHOT_META } from "@/lib/demand/dummy-data";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** 허브: 판다랭크식 훅 문구 (title 대신 또는 함께) */
  heroTagline?: string;
  /** 허브: 헤더·배경 최소화 */
  variant?: "default" | "minimal";
  /** 허브: 오늘·월간 메타 모두 표시 */
  metaVariant?: "default" | "hub";
  /** 허브는 페이지에서 hero 검색 사용 */
  searchVariant?: false | "bar";
};

export default function DemandShell({
  title,
  subtitle,
  children,
  variant = "default",
  heroTagline,
  metaVariant = "default",
  searchVariant = "bar",
}: Props) {
  const minimal = variant === "minimal";

  return (
    <div
      className={
        minimal ? "min-h-screen bg-white" : "relative min-h-screen overflow-hidden bg-gradient-to-b from-teal-50/50 via-white to-slate-50/80"
      }
    >
      {!minimal ? (
        <div
          className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-gradient-to-b from-teal-200/20 via-emerald-100/10 to-transparent blur-3xl"
          aria-hidden
        />
      ) : null}
      <div className={minimal ? "page-shell py-6 lg:py-8" : "page-shell relative py-8 lg:py-12"}>
        <header className={minimal ? "mb-5" : "mb-6 lg:mb-8"}>
          {!minimal ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800/90">입주수요</p>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200/80">
                {DEMAND_PHASE0_BADGE}
              </span>
            </div>
          ) : (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200/80">
              {DEMAND_PHASE0_BADGE}
            </span>
          )}
          {heroTagline ? (
            <h1
              className={
                minimal
                  ? "mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl"
                  : "mt-2 text-lg font-bold text-slate-900"
              }
            >
              {heroTagline}
            </h1>
          ) : (
            <h1
              className={
                minimal
                  ? "text-xl font-bold text-slate-900"
                  : "mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl"
              }
            >
              {title}
            </h1>
          )}
          {subtitle ? (
            <p className={cn("text-sm leading-relaxed text-slate-600", heroTagline ? "mt-2" : "mt-1")}>
              {subtitle}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">
            {metaVariant === "hub" ? (
              <>
                {DEMAND_SNAPSHOT_META.baseMonthLabel} · {DEMAND_SNAPSHOT_META.publishedAtLabel}
              </>
            ) : (
              <>
                {DEMAND_SNAPSHOT_META.baseMonthLabel} · {DEMAND_SNAPSHOT_META.publishedAtLabel}
              </>
            )}
          </p>
        </header>

        {searchVariant === "bar" ? <DemandSearch variant="bar" /> : null}

        <DemandAdminNavGate className="mb-6" />

        {children}

        {minimal ? (
          <details className="mt-8 text-xs text-slate-400">
            <summary className="cursor-pointer hover:text-slate-600">참고 · 면책</summary>
            <p className="mt-2 leading-relaxed">
              미리보기 더미 데이터입니다. 검색지수는 네이버 데이터랩 상대값이며 실제 검색 건수가 아닙니다.
            </p>
          </details>
        ) : (
          <DemandDisclaimer className="mt-10" />
        )}
      </div>
    </div>
  );
}
