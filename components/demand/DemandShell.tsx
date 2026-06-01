import type { ReactNode } from "react";
import { DEMAND_PHASE0_BADGE } from "@/lib/demand/copy";
import DemandNav from "@/components/demand/DemandNav";
import DemandSearch from "@/components/demand/DemandSearch";
import DemandDisclaimer from "@/components/demand/DemandDisclaimer";
import { DEMAND_SNAPSHOT_META } from "@/lib/demand/dummy-data";
import { DEMAND_TODAY_META } from "@/lib/demand/dummy-daily";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  hideNav?: boolean;
  /** 허브: 오늘·월간 메타 모두 표시 */
  metaVariant?: "default" | "hub";
  /** 허브는 페이지에서 hero 검색 사용 */
  searchVariant?: false | "bar";
};

export default function DemandShell({
  title,
  subtitle,
  children,
  hideNav,
  metaVariant = "default",
  searchVariant = "bar",
}: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-teal-50/50 via-white to-slate-50/80">
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-gradient-to-b from-teal-200/20 via-emerald-100/10 to-transparent blur-3xl"
        aria-hidden
      />
      <div className="page-shell relative py-8 lg:py-12">
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800/90">입주수요 · 지역 탐험</p>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200/80">
              {DEMAND_PHASE0_BADGE}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{subtitle}</p>
          ) : null}
          <p className="mt-2 text-xs font-medium text-slate-500">
            {metaVariant === "hub" ? (
              <>
                <span className="text-teal-800">오늘</span> {DEMAND_TODAY_META.briefingDateLabel} ·{" "}
                <span className="text-slate-700">이번 달</span> {DEMAND_SNAPSHOT_META.baseMonthLabel} (
                {DEMAND_SNAPSHOT_META.publishedAtLabel})
              </>
            ) : (
              <>
                데이터 기준: {DEMAND_SNAPSHOT_META.baseMonthLabel} · {DEMAND_SNAPSHOT_META.publishedAtLabel}
              </>
            )}
          </p>
        </div>

        {searchVariant === "bar" ? <DemandSearch variant="bar" /> : null}

        {!hideNav ? <DemandNav className="mb-8" /> : null}

        {children}

        <DemandDisclaimer className="mt-10" />
      </div>
    </div>
  );
}
