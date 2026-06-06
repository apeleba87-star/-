import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import DemandAdminNavGate from "@/components/demand/DemandAdminNavGate";
import DemandSearch from "@/components/demand/DemandSearch";
import DemandDisclaimer from "@/components/demand/DemandDisclaimer";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** 허브: 판다랭크식 훅 문구 (title 대신 또는 함께) */
  heroTagline?: string;
  /** 허브: 헤더·배경 최소화 */
  variant?: "default" | "minimal";
  /** @deprecated unused */
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
        </header>

        {searchVariant === "bar" ? <DemandSearch variant="bar" /> : null}

        <DemandAdminNavGate className="mb-6" />

        {children}

        <DemandDisclaimer className={minimal ? "mt-8" : "mt-10"} />
      </div>
    </div>
  );
}
