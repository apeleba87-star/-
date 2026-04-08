"use client";

import type React from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Sparkles,
  FileText,
  Banknote,
  MapPin,
  Building2,
  Clock,
  Lightbulb,
  Info,
  BarChart2,
  Gauge,
  ShieldAlert,
  Target,
  Lock,
  Crown,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Layers,
} from "lucide-react";
import type { DailyTenderPayload } from "@/lib/content/tender-report-queries";
import { buildRegionSummarySentence } from "@/lib/content/tender-report-formatters";
import { SHARED_RANDOM_PANEL_COUNT, type SharedRandomPanelKey } from "@/lib/report/share-unlock-panels";
import DataTrust3Pack from "@/components/DataTrust3Pack";
import ReportShareUnlockButton from "@/components/report/ReportShareUnlockButton";
import RelatedReportsSection from "@/components/report/RelatedReportsSection";
import type { RelatedReportPostRow } from "@/lib/content/related-report-posts";
import ReportLoginRequiredInline from "@/components/report/ReportLoginRequiredInline";
import { isGuestLockedCount } from "@/lib/report/guest-teaser-redact";

const CHART_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
];

const chartTooltipContentStyle = {
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  fontSize: 12,
} as const;

function maxInCounts(items: { count: number }[]): number {
  return items.reduce((m, x) => Math.max(m, x.count), 0);
}

function PremiumInsightBarRow({
  label,
  count,
  max,
  colorIndex,
  showShare,
  total,
}: {
  label: string;
  count: number;
  max: number;
  colorIndex: number;
  showShare?: boolean;
  total?: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;
  const share =
    showShare && total != null && total > 0 ? ((count / total) * 100).toFixed(1) : null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium text-slate-800" title={label}>
          {label}
        </span>
        <span className="shrink-0 tabular-nums text-slate-600">
          <span className="font-semibold text-slate-800">{count}</span>
          <span className="text-slate-400">건</span>
          {share != null && <span className="ml-1.5 text-xs text-slate-400">({share}%)</span>}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: CHART_COLORS[colorIndex % CHART_COLORS.length],
          }}
        />
      </div>
    </div>
  );
}

type Props = {
  postId?: string;
  payload: DailyTenderPayload;
  title: string;
  dateLabel: string;
  insightSentence: string;
  excerpt?: string | null;
  updatedAt?: string | null;
  accessLevel?: "free" | "shared" | "premium";
  /** 공유 해금 시 열리는 심화 패널 키 (SHARED_RANDOM_PANEL_COUNT) */
  sharedRevealKeys?: SharedRandomPanelKey[] | null;
  premiumInsights?: {
    weekCompare: { currentWeekCount: number; prevWeekCount: number; deltaPct: number | null };
    drilldown: { topRegions: { name: string; count: number }[]; topIndustries: { name: string; count: number }[] };
    agencies: { name: string; count: number }[];
    budgetBands: { label: string; count: number }[];
    anomalies: string[];
  } | null;
  /** 글 하단 우리 팀 공유(컴팩트) 카드 바로 위 */
  relatedReports?: RelatedReportPostRow[];
  /** 비로그인 티저: 서버에서 마스킹된 payload + 일부 칸만 락 */
  guestTeaser?: boolean;
  loginNext?: string;
};

export default function DailyTenderReportDashboard({
  postId,
  payload,
  title,
  dateLabel,
  insightSentence,
  excerpt,
  updatedAt,
  accessLevel = "free",
  sharedRevealKeys = null,
  premiumInsights = null,
  relatedReports = [],
  guestTeaser = false,
  loginNext = "",
}: Props) {
  const { count_total, region_breakdown, top_budget_tenders, deadline_soon_tenders, industry_breakdown, top_industry } = payload;

  const isIndustryPayload = Boolean(industry_breakdown?.length);
  const topRegionShare =
    count_total > 0 && region_breakdown[0]
      ? Math.round((region_breakdown[0].count / count_total) * 1000) / 10
      : 0;
  const topIndustryShare =
    count_total > 0 && top_industry && top_industry.count > 0
      ? Math.round((top_industry.count / count_total) * 1000) / 10
      : 0;

  const regionChartData = region_breakdown.slice(0, 12).map((r) => {
    const c = isGuestLockedCount(r.count) ? 0 : r.count;
    const pct = count_total > 0 && !isGuestLockedCount(r.count) ? Math.round((r.count / count_total) * 1000) / 10 : 0;
    return { name: r.name, count: c, pct, locked: isGuestLockedCount(r.count) };
  });
  const averageBudget = count_total > 0 ? Math.round(payload.budget_total / count_total) : 0;
  const highBudgetCount = top_budget_tenders.filter((t) => t.budget > averageBudget * 1.5).length;
  const deadlinePressure = Math.min(100, deadline_soon_tenders.length * 18 + (payload.has_budget_unknown ? 10 : 0));
  const concentrationScore = Math.min(100, Math.round(topRegionShare + topIndustryShare));
  const marketHeat = Math.min(
    100,
    Math.round(
      Math.min(60, count_total * 1.2) + Math.min(20, highBudgetCount * 6) + Math.min(20, concentrationScore * 0.3)
    )
  );
  const riskScore = Math.min(100, Math.round(deadlinePressure * 0.6 + concentrationScore * 0.3 + (payload.has_budget_unknown ? 10 : 0)));
  const sharedRevealSet = new Set<string>(sharedRevealKeys ?? []);
  const coreUnlocked = accessLevel === "premium" || accessLevel === "shared";
  const deepOpen = (key: SharedRandomPanelKey) =>
    accessLevel === "premium" || (accessLevel === "shared" && sharedRevealSet.has(key));

  const tenderTeamShareText = [
    `입찰 ${count_total.toLocaleString()}건`,
    "✔ 바로 지원 가능한 것만 선별",
    "✔ 경쟁 낮은 건 포함",
    "",
    "오늘 안 보면 끝입니다",
    "",
    "👇 지금 확인",
  ].join("\n");

  return (
    <div className="mx-auto min-w-0 max-w-[1400px] space-y-4 rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50 p-2 xs:p-3 sm:space-y-6 sm:p-6 lg:space-y-8 lg:p-8">
      {/* 1. 헤더 (히어로 배너) */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-4 shadow-2xl sm:p-8">
        <div
          className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl sm:-right-20 sm:-top-20 sm:h-64 sm:w-64"
          aria-hidden
        />
        <div
          className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-3xl sm:-bottom-32 sm:-left-32 sm:h-96 sm:w-96"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md sm:h-14 sm:w-14">
              <Sparkles className="h-5 w-5 text-white sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-4xl">
                {title}
              </h1>
              <p className="mt-1 text-xs text-blue-100 sm:text-lg">
                {excerpt ?? (isIndustryPayload ? "등록 업종 기준 입찰 요약" : "청소·소독·방역 입찰 요약")}
              </p>
              <p className="mt-2 text-base font-medium text-blue-100 sm:text-xl">{dateLabel}</p>
            </div>
          </div>
          <div className="self-start rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            {accessLevel === "premium"
              ? "프리미엄 전체 분석"
              : accessLevel === "shared"
                ? `공유 · 심화 ${SHARED_RANDOM_PANEL_COUNT}종 + 당일 핵심`
                : "기본 요약 모드"}
          </div>
        </div>
      </header>

      {/* 오늘 한눈에: 데이터 히어로 */}
      <section
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-200/40 sm:p-5"
        aria-label="오늘 한눈에 요약"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">오늘 한눈에</p>
          <p className="text-xs text-slate-400">{dateLabel}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="flex flex-col rounded-xl border border-slate-100 bg-gradient-to-br from-blue-50/90 to-white p-3.5 sm:p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <FileText className="h-3.5 w-3.5 text-blue-600" aria-hidden />
              총 공고
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">{count_total.toLocaleString()}</p>
            <p className="text-xs text-slate-500">건</p>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-100 bg-gradient-to-br from-violet-50/80 to-white p-3.5 sm:p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-violet-600" aria-hidden />
              1위 지역
            </div>
            {guestTeaser ? (
              <div className="mt-2">
                <ReportLoginRequiredInline loginNext={loginNext} />
              </div>
            ) : topRegionShare > 0 && region_breakdown[0] ? (
              <>
                <p className="mt-2 line-clamp-2 text-base font-bold leading-snug text-slate-900 sm:text-lg">
                  {region_breakdown[0].name}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {region_breakdown[0].count.toLocaleString()}건 · 전체의 {topRegionShare}%
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">집계 없음</p>
            )}
          </div>

          <div className="flex flex-col rounded-xl border border-slate-100 bg-gradient-to-br from-emerald-50/80 to-white p-3.5 sm:p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <BarChart2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              {isIndustryPayload ? "1위 업종" : "예산 합계"}
            </div>
            {guestTeaser ? (
              <div className="mt-2">
                <ReportLoginRequiredInline loginNext={loginNext} />
              </div>
            ) : isIndustryPayload && top_industry && top_industry.count > 0 ? (
              <>
                <p className="mt-2 line-clamp-2 text-base font-bold leading-snug text-slate-900 sm:text-lg">
                  {top_industry.name}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {top_industry.count.toLocaleString()}건
                  {topIndustryShare > 0 ? ` · 전체의 ${topIndustryShare}%` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-base font-bold tabular-nums text-slate-900 sm:text-lg">{payload.budget_label}</p>
                <p className="mt-1 text-xs text-slate-600">당일 기초금액 합산 기준</p>
              </>
            )}
          </div>

          <div className="flex flex-col rounded-xl border border-slate-100 bg-gradient-to-br from-amber-50/90 to-white p-3.5 sm:p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5 text-amber-600" aria-hidden />
              마감 임박
            </div>
            {guestTeaser ? (
              <div className="mt-2">
                <ReportLoginRequiredInline loginNext={loginNext} />
              </div>
            ) : (
              <>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
                  {deadline_soon_tenders.length}
                </p>
                <p className="text-xs text-slate-500">건 (상위 표시 구간)</p>
              </>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {isIndustryPayload
            ? "등록 업종·지역 기준 당일 집계입니다. 아래 차트에서 세부 분포를 확인할 수 있습니다."
            : "청소·소독·방역 분류 기준 당일 집계입니다. 지역·마감은 리포트에 반영된 공고만 해당합니다."}
        </p>
      </section>

      {/* 데이터 신뢰 3종 세트 */}
      <DataTrust3Pack
        source="나라장터 G2B(입찰 데이터 집계)"
        updatedAt={updatedAt}
        sampleCount={count_total}
      />

      {/* 2. 핵심 지표 카드 2개 (총 공고, 1위 업종 또는 1위 지역) */}
      <section className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <div className="rounded-xl border-0 bg-white p-4 shadow-lg transition-shadow duration-300 hover:shadow-xl sm:p-6">
          <div className="mb-3 flex items-center justify-between space-y-0 sm:mb-4">
            <span className="text-xs text-slate-500 sm:text-sm">
              {isIndustryPayload ? "등록 업종 기준 총 공고" : "총 공고"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 sm:h-10 sm:w-10">
              <FileText className="h-4 w-4 text-blue-600 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-600 sm:text-4xl">
            {count_total.toLocaleString()}건
          </p>
          <p className="mt-1.5 text-xs text-slate-500 sm:mt-2">
            {isIndustryPayload ? "등록된 업종에 해당하는 공고" : "청소·소독·방역 분류 공고"}
          </p>
        </div>
        {guestTeaser ? (
          <div className="flex min-h-[140px] flex-col justify-center rounded-xl border-0 bg-white p-4 shadow-lg sm:p-6">
            <p className="text-xs text-slate-500 sm:text-sm">상세 분포</p>
            <div className="mt-3">
              <ReportLoginRequiredInline loginNext={loginNext} />
            </div>
          </div>
        ) : isIndustryPayload && top_industry ? (
          <div className="rounded-xl border-0 bg-white p-4 shadow-lg transition-shadow duration-300 hover:shadow-xl sm:p-6">
            <div className="mb-3 flex items-center justify-between space-y-0 sm:mb-4">
              <span className="text-xs text-slate-500 sm:text-sm">1위 업종</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 sm:h-10 sm:w-10">
                <BarChart2 className="h-4 w-4 text-purple-600 sm:h-5 sm:w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-600 sm:text-4xl">{top_industry.name}</p>
            <p className="mt-1.5 text-xs text-slate-500 sm:mt-2">
              {top_industry.count}건{topIndustryShare > 0 ? ` (${topIndustryShare}%)` : ""}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border-0 bg-white p-4 shadow-lg transition-shadow duration-300 hover:shadow-xl sm:p-6">
            <div className="mb-3 flex items-center justify-between space-y-0 sm:mb-4">
              <span className="text-xs text-slate-500 sm:text-sm">1위 지역 비중</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 sm:h-10 sm:w-10">
                <MapPin className="h-4 w-4 text-purple-600 sm:h-5 sm:w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-600 sm:text-4xl">{topRegionShare}%</p>
            <p className="mt-1.5 text-xs text-slate-500 sm:mt-2">
              {region_breakdown[0]?.name ?? "—"} ({region_breakdown[0]?.count ?? 0}건)
            </p>
          </div>
        )}
      </section>

      {/* 2-1. 업종별 공고 (등록 업종 기준 payload일 때만) */}
      {isIndustryPayload && industry_breakdown && industry_breakdown.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 sm:h-12 sm:w-12">
              <BarChart2 className="h-5 w-5 text-emerald-600 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">업종별 공고</h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm leading-snug">
                등록된 업종(업종관리) 기준 당일 공고 건수입니다.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <div className="h-64 w-full min-w-0 sm:h-80">
              {(() => {
                const industryChartData = industry_breakdown
                  .map((r, i) => ({
                    name: r.industry_name,
                    value: isGuestLockedCount(r.count) ? 0 : r.count,
                    index: i,
                    count: r.count,
                  }))
                  .filter((d) => d.value > 0);
                if (industryChartData.length === 0) {
                  return (
                    <div className="flex h-full min-h-[12rem] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
                      해당 일자 공고가 없습니다.
                    </div>
                  );
                }
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          fontSize: 12,
                        }}
                        formatter={(value, name, item) => {
                          const val = typeof value === "number" ? value : 0;
                          const payload = item?.payload as { count?: number } | undefined;
                          const pct =
                            count_total > 0 && payload?.count != null
                              ? ((payload.count / count_total) * 100).toFixed(1)
                              : "0";
                          return [`${val}건 (${pct}%)`, String(name ?? "")];
                        }}
                      />
                      <Pie
                        data={industryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="80%"
                        paddingAngle={1}
                        stroke="none"
                        label={({ cx, cy, midAngle, outerRadius, name, value }) => {
                          const RADIAN = Math.PI / 180;
                          const _cx = Number(cx) || 0;
                          const _cy = Number(cy) || 0;
                          const _mid = midAngle ?? 0;
                          const radius = (Number(outerRadius) || 0) + 24;
                          const x = _cx + radius * Math.cos(-_mid * RADIAN);
                          const y = _cy + radius * Math.sin(-_mid * RADIAN);
                          const pct =
                            count_total > 0
                              ? ((value / count_total) * 100).toFixed(1)
                              : "0";
                          const pctNum = parseFloat(pct);
                          const labelText =
                            pctNum >= 8 ? `${name} ${pct}%` : `${pct}%`;
                          return (
                            <text
                              x={x}
                              y={y}
                              fill="#334155"
                              textAnchor={x >= _cx ? "start" : "end"}
                              dominantBaseline="central"
                              className="text-[10px] sm:text-xs font-medium"
                            >
                              {labelText}
                            </text>
                          );
                        }}
                      >
                        {industryChartData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={CHART_COLORS[entry.index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
            <div className="space-y-2.5 sm:space-y-3">
              {[...industry_breakdown]
                .map((r, i) => ({ ...r, originalIndex: i }))
                .sort((a, b) => b.count - a.count)
                .map((r) => {
                  const pct = count_total > 0 ? (r.count / count_total) * 100 : 0;
                  const colorIndex = (r as { originalIndex: number }).originalIndex % CHART_COLORS.length;
                  return (
                    <div key={r.industry_code} className="space-y-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <Link
                          href={`/tenders?industry=${encodeURIComponent(r.industry_code)}`}
                          className="flex min-w-0 items-center gap-2 truncate text-slate-800 hover:text-blue-600 hover:underline"
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3"
                            style={{ backgroundColor: CHART_COLORS[colorIndex] }}
                          />
                          <span className="truncate">{r.industry_name}</span>
                        </Link>
                        <span className="shrink-0 text-slate-600">
                          {isGuestLockedCount(r.count) ? (
                            <ReportLoginRequiredInline loginNext={loginNext} className="text-xs" />
                          ) : (
                            <>
                              {pct.toFixed(1)}% · <span className="font-medium">{r.count}건</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 sm:h-2">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${isGuestLockedCount(r.count) ? 0 : pct}%`,
                            backgroundColor: CHART_COLORS[colorIndex],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 sm:mt-4">
            업종명을 클릭하면 해당 업종 필터가 적용된{" "}
            <Link href="/tenders" className="text-blue-600 hover:underline">
              입찰 공고
            </Link>
            로 이동합니다.
          </p>
        </section>
      )}

      {/* 3. 지역별 분포 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 sm:h-12 sm:w-12">
            <MapPin className="h-5 w-5 text-indigo-600 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">지역별 분포</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm leading-snug">
              {guestTeaser
                ? "지역·건수는 일부만 공개됩니다. 로그인하면 차트·목록 전체를 볼 수 있습니다."
                : buildRegionSummarySentence(region_breakdown)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="h-64 w-full min-w-0 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionChartData} margin={{ top: 8, right: 4, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 10 }} />
                <YAxis tick={{ fill: "#666", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value != null ? Number(value) : 0}건`, "건수"]}
                  labelFormatter={(label) => `지역: ${label}`}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {regionChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {region_breakdown.slice(0, 10).map((r, i) => {
              const pct =
                count_total > 0 && !isGuestLockedCount(r.count) ? (r.count / count_total) * 100 : 0;
              return (
                <div key={r.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="truncate">{r.name}</span>
                    </span>
                    <span className="shrink-0 text-slate-600">
                      {isGuestLockedCount(r.count) ? (
                        <ReportLoginRequiredInline loginNext={loginNext} className="text-xs" />
                      ) : (
                        <>
                          {pct.toFixed(1)}% · <span className="font-medium">{r.count}건</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 sm:h-2">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. 예산 상위 공고 */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:gap-3 sm:text-2xl">
            <Banknote className="h-6 w-6 text-emerald-600 sm:h-8 sm:w-8" />
            예산 상위 공고
          </h2>
          <Link
            href="/tenders?sort=amount-high"
            className="text-sm font-medium text-blue-600 hover:underline sm:text-base"
          >
            전체 보기
          </Link>
        </div>
        <div className="space-y-3 sm:space-y-4">
          {top_budget_tenders.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 sm:p-6">
              {count_total === 0 && isIndustryPayload
                ? "해당 일자에는 등록된 업종에 해당하는 공고가 없었습니다."
                : "등록된 공고가 없습니다."}
            </p>
          ) : (
            top_budget_tenders.map((t, i) =>
              guestTeaser && (!String(t.title).trim() || isGuestLockedCount(t.budget)) ? (
                <div
                  key={i}
                  className="flex min-h-[100px] min-w-0 items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 sm:gap-4 sm:p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-base font-bold text-slate-600 sm:h-12 sm:w-12">
                    {i + 1}
                  </div>
                  <div className="flex flex-1 items-center justify-center py-2">
                    <ReportLoginRequiredInline loginNext={loginNext} />
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className="flex min-w-0 gap-3 rounded-xl border-2 border-slate-200 bg-gradient-to-r from-white to-slate-50/50 p-4 transition-all duration-300 hover:border-blue-300 hover:shadow-md active:border-blue-400 sm:gap-4 sm:p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-bold text-white shadow-lg sm:h-12 sm:w-12 sm:text-lg">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                    <h3 className="text-sm font-bold leading-snug text-slate-900 line-clamp-2 transition-colors duration-300 hover:text-blue-600 sm:text-lg">
                      {t.title}
                    </h3>
                    <div className="flex flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:text-sm">
                      <span className="flex items-center gap-1 truncate">
                        <Building2 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                        <span className="truncate">{t.agency}</span>
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-emerald-600">
                        <Banknote className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                        {t.budgetLabel}
                      </span>
                      <span className="flex items-center gap-1 text-amber-600">
                        <Clock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                        {t.deadlineLabel}
                      </span>
                    </div>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </section>

      {/* 5. 마감 임박 공고 */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:gap-3 sm:text-2xl">
            <Clock className="h-6 w-6 text-amber-600 sm:h-8 sm:w-8" />
            마감 임박 공고
          </h2>
          <Link
            href="/tenders?sort=deadline"
            className="text-sm font-medium text-blue-600 hover:underline sm:text-base"
          >
            전체 보기
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {deadline_soon_tenders.length === 0 ? (
            <p className="col-span-full rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 sm:p-6">
              {count_total === 0 && isIndustryPayload
                ? "해당 일자에는 등록된 업종에 해당하는 공고가 없었습니다."
                : "해당 일자 기준 마감 임박 공고가 없습니다."}
            </p>
          ) : (
            deadline_soon_tenders.map((t, i) =>
              guestTeaser && !String(t.title).trim() ? (
                <div
                  key={i}
                  className="relative flex min-h-[120px] min-w-0 items-center justify-center rounded-xl border-2 border-dashed border-red-200/80 bg-red-50/30 p-3.5 sm:p-4"
                >
                  <ReportLoginRequiredInline loginNext={loginNext} />
                </div>
              ) : (
                <div
                  key={i}
                  className="relative min-w-0 rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50/80 to-amber-50/80 p-3.5 active:shadow-xl sm:p-4"
                >
                  <span className="absolute right-2.5 top-2.5 flex min-h-[28px] min-w-[44px] items-center justify-center rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white sm:right-3 sm:top-3 sm:py-1">
                    D-Day
                  </span>
                  <h3 className="pr-14 text-sm font-semibold leading-snug text-slate-900 line-clamp-2 sm:pr-16 sm:text-base">
                    {t.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-slate-600 sm:text-sm">{t.agency}</p>
                  <p className="mt-2 text-xs font-medium text-red-600 sm:text-sm">{t.deadlineLabel}</p>
                </div>
              )
            )
          )}
        </div>
      </section>

      {/* 6. 오늘의 인사이트 */}
      <section className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-slate-50 to-blue-50/50 p-4 shadow-lg sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 sm:h-10 sm:w-10">
            <Lightbulb className="h-5 w-5 text-blue-600 sm:h-6 sm:w-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 sm:text-xl">오늘의 인사이트</h2>
        </div>
        <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3 sm:mt-4 sm:p-4">
          <p className="text-sm leading-snug text-slate-700 sm:text-base">{insightSentence}</p>
        </div>
      </section>

      {/* 6-1. 프리미엄 패널 (당일 핵심 + 심화 분석 통합) */}
      <section className="relative overflow-hidden rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/50 p-4 shadow-xl shadow-violet-500/10 ring-1 ring-violet-100/60 sm:p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-violet-200/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-indigo-200/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 sm:h-14 sm:w-14">
              <Layers className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">프리미엄 패널</h2>
                {accessLevel === "premium" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600/15 to-indigo-600/15 px-2.5 py-0.5 text-xs font-semibold text-violet-900 ring-1 ring-violet-300/60">
                    <Crown className="h-3.5 w-3.5 text-violet-600" />
                    전용 인사이트
                  </span>
                )}
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                오늘 시장 온도·리스크·실행 우선순위를 먼저 보고, 이어서 주간 흐름·지역·업종·발주처·금액대를 한곳에서 비교할 수 있습니다.
              </p>
              {accessLevel === "free" && postId && (
                <div className="mt-4 max-w-xl">
                  <ReportShareUnlockButton
                    postId={postId}
                    shareTitle={title}
                    shareText={tenderTeamShareText}
                    layout="full"
                  />
                </div>
              )}
            </div>
          </div>
          <Link
            href="/tenders"
            className="inline-flex shrink-0 items-center justify-center gap-1 self-stretch rounded-xl border border-violet-200/90 bg-white px-3 py-2.5 text-xs font-semibold text-violet-800 shadow-md shadow-violet-500/5 transition hover:border-violet-400 hover:bg-violet-50/80 sm:self-start sm:py-2 sm:text-sm"
          >
            입찰 목록에서 필터
            <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
          </Link>
        </div>

        {/* 당일 핵심 (시장 온도 · 리스크 · 실행 우선순위) */}
        <div className="relative mt-8 rounded-2xl border border-violet-200/40 bg-white/55 p-4 shadow-inner shadow-violet-500/5 backdrop-blur-sm sm:p-5">
          <div className="mb-4 border-b border-violet-100/80 pb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-600/90">당일 핵심</p>
            <p className="mt-0.5 text-xs text-slate-500">당일 데이터 기준 요약 지표입니다.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <DecisionPanel
              open={coreUnlocked}
              title="시장 온도"
              icon={<Gauge className="h-5 w-5 text-blue-600" />}
              lockMessage="공유 또는 프리미엄에서 시장 온도를 확인할 수 있습니다."
              accessLevel={accessLevel}
              tone="premium"
            >
              <p className="text-3xl font-bold tabular-nums text-blue-700">{marketHeat}점</p>
              <p className="mt-2 text-sm leading-snug text-slate-600">
                공고 수·고예산 비중·집중도를 반영한 당일 온도 지수입니다.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex justify-between gap-2 border-b border-slate-100/80 pb-1.5">
                  <span className="text-slate-500">총 공고</span>
                  <span className="font-semibold text-slate-800">{count_total.toLocaleString()}건</span>
                </li>
                <li className="flex justify-between gap-2 border-b border-slate-100/80 pb-1.5">
                  <span className="text-slate-500">평균 예산</span>
                  <span className="font-semibold text-slate-800">
                    {averageBudget > 0 ? `${Math.round(averageBudget / 10000).toLocaleString()}만원` : "—"}
                  </span>
                </li>
                <li className="flex justify-between gap-2 pt-0.5">
                  <span className="text-slate-500">고예산 신호</span>
                  <span className="font-semibold text-slate-800">{highBudgetCount}건</span>
                </li>
              </ul>
            </DecisionPanel>

            <DecisionPanel
              open={coreUnlocked}
              title="리스크 경보"
              icon={<ShieldAlert className="h-5 w-5 text-amber-600" />}
              lockMessage="공유 또는 프리미엄에서 리스크 경보를 확인할 수 있습니다."
              accessLevel={accessLevel}
              tone="premium"
            >
              <p className="text-3xl font-bold tabular-nums text-amber-700">{riskScore}점</p>
              <p className="mt-2 text-sm leading-snug text-slate-600">
                마감 압박·시장 집중·예산 미기재 신호를 반영한 리스크 지수입니다.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex justify-between gap-2 border-b border-slate-100/80 pb-1.5">
                  <span className="text-slate-500">마감 임박</span>
                  <span className="font-semibold text-slate-800">{deadline_soon_tenders.length}건</span>
                </li>
                <li className="flex justify-between gap-2 border-b border-slate-100/80 pb-1.5">
                  <span className="text-slate-500">집중도 신호</span>
                  <span className="font-semibold text-slate-800">{concentrationScore}점</span>
                </li>
                <li className="flex justify-between gap-2 pt-0.5">
                  <span className="text-slate-500">예산 미기재</span>
                  <span className="font-semibold text-slate-800">{payload.has_budget_unknown ? "있음" : "없음"}</span>
                </li>
              </ul>
            </DecisionPanel>

            <DecisionPanel
              open={coreUnlocked}
              title="실행 우선순위"
              icon={<Target className="h-5 w-5 text-emerald-600" />}
              lockMessage="공유 또는 프리미엄에서 실행 우선순위를 확인할 수 있습니다."
              accessLevel={accessLevel}
              tone="premium"
            >
              <ol className="space-y-3 text-sm leading-snug text-slate-700">
                <li className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
                    1
                  </span>
                  <span>{deadline_soon_tenders[0]?.agency ?? "주요 발주처"} 마감 임박 건부터 검토</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
                    2
                  </span>
                  <span>{region_breakdown[0]?.name ?? "상위 지역"} 중심으로 필터링 후 우선 공략</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
                    3
                  </span>
                  <span>고예산({highBudgetCount}건) 공고를 별도 큐로 분리</span>
                </li>
              </ol>
              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                매일 데이터 변화에 맞춰 자동 갱신됩니다.
              </p>
            </DecisionPanel>
          </div>
        </div>

        <div className="relative mt-8 border-t border-violet-200/50 pt-8">
          <div className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-600/90">심화 분석</p>
            <p className="mt-0.5 text-xs text-slate-500">주간 비교·구조 분포·경고 히스토리입니다.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DecisionPanel
            open={deepOpen("week_compare")}
            title="기간 비교 (7일/전주)"
            icon={<BarChart2 className="h-5 w-5 text-indigo-600" />}
            lockMessage={`공유 시 무작위 ${SHARED_RANDOM_PANEL_COUNT}종 중 하나일 수 있습니다. 프리미엄에서 전체를 확인할 수 있습니다.`}
            accessLevel={accessLevel}
            tone="premium"
          >
            {(() => {
              const cur = premiumInsights?.weekCompare.currentWeekCount ?? 0;
              const prev = premiumInsights?.weekCompare.prevWeekCount ?? 0;
              const delta = premiumInsights?.weekCompare.deltaPct;
              const maxW = Math.max(cur, prev, 1);
              const TrendIcon =
                delta == null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
              const trendClass =
                delta == null
                  ? "text-slate-500"
                  : delta > 0
                    ? "text-indigo-600"
                    : delta < 0
                      ? "text-amber-700"
                      : "text-slate-500";
              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${trendClass} bg-slate-50 ring-1 ring-slate-200/80`}
                    >
                      <TrendIcon className="h-4 w-4 shrink-0" />
                      전주 대비{" "}
                      {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta}%`}
                    </span>
                    <span className="text-xs text-slate-500">KST 기준 최근 7일 창 비교</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="rounded-xl border border-indigo-100/80 bg-indigo-50/40 p-3 sm:p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600/90">이번 주</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">{cur}</p>
                      <p className="text-xs text-slate-500">건</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 sm:p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">전주 동기</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-700 sm:text-3xl">{prev}</p>
                      <p className="text-xs text-slate-500">건</p>
                    </div>
                  </div>
                  <div className="h-36 w-full min-w-0 sm:h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: "이번 주", v: cur },
                          { name: "전주 동기", v: prev },
                        ]}
                        margin={{ top: 12, right: 12, left: 4, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, maxW]} width={32} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipContentStyle} formatter={(v) => [`${v}건`, "공고 수"]} />
                        <Bar dataKey="v" radius={[8, 8, 0, 0]} maxBarSize={56}>
                          <Cell fill="#6366f1" />
                          <Cell fill="#94a3b8" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">
                    세로축은 두 기간 중 큰 값({maxW}건)까지 스케일됩니다.
                  </p>
                </div>
              );
            })()}
          </DecisionPanel>

          <DecisionPanel
            open={deepOpen("drilldown")}
            title="지역·업종 드릴다운"
            icon={<MapPin className="h-5 w-5 text-cyan-600" />}
            lockMessage={`공유 시 무작위 ${SHARED_RANDOM_PANEL_COUNT}종 중 하나일 수 있습니다. 프리미엄에서 전체를 확인할 수 있습니다.`}
            accessLevel={accessLevel}
            tone="premium"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {(() => {
                const regions = (premiumInsights?.drilldown.topRegions ?? []).slice(0, 5);
                const industries = (premiumInsights?.drilldown.topIndustries ?? []).slice(0, 5);
                const rMax = maxInCounts(regions);
                const iMax = maxInCounts(industries);
                const rTotal = regions.reduce((s, x) => s + x.count, 0);
                const iTotal = industries.reduce((s, x) => s + x.count, 0);
                return (
                  <>
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-cyan-800/90">상위 지역</p>
                      {regions.length === 0 ? (
                        <p className="text-sm text-slate-500">데이터 없음</p>
                      ) : (
                        <>
                          <div className="h-36 w-full min-w-0 sm:h-40">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                layout="vertical"
                                data={regions.map((r, i) => ({
                                  name:
                                    r.name.length > 7
                                      ? `${i + 1}. ${r.name.slice(0, 6)}…`
                                      : `${i + 1}. ${r.name}`,
                                  full: r.name,
                                  c: r.count,
                                }))}
                                margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                              >
                                <XAxis type="number" hide domain={[0, Math.max(rMax, 1)]} />
                                <YAxis
                                  type="category"
                                  dataKey="name"
                                  width={68}
                                  tick={{ fontSize: 11, fill: "#475569" }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip
                                  contentStyle={chartTooltipContentStyle}
                                  formatter={(v, _n, item) => {
                                    const row = item?.payload as { full?: string; c?: number } | undefined;
                                    return [`${v}건`, row?.full ?? ""];
                                  }}
                                />
                                <Bar dataKey="c" radius={[0, 4, 4, 0]} maxBarSize={14}>
                                  {regions.map((_, idx) => (
                                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-2.5 border-t border-slate-100 pt-3">
                            {regions.slice(0, 3).map((r, i) => (
                              <PremiumInsightBarRow
                                key={r.name}
                                label={r.name}
                                count={r.count}
                                max={rMax}
                                colorIndex={i}
                                showShare
                                total={rTotal}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-cyan-800/90">상위 업종</p>
                      {industries.length === 0 ? (
                        <p className="text-sm text-slate-500">데이터 없음</p>
                      ) : (
                        <>
                          <div className="h-36 w-full min-w-0 sm:h-40">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                layout="vertical"
                                data={industries.map((r, i) => ({
                                  name:
                                    r.name.length > 7
                                      ? `${i + 1}. ${r.name.slice(0, 6)}…`
                                      : `${i + 1}. ${r.name}`,
                                  full: r.name,
                                  c: r.count,
                                }))}
                                margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                              >
                                <XAxis type="number" hide domain={[0, Math.max(iMax, 1)]} />
                                <YAxis
                                  type="category"
                                  dataKey="name"
                                  width={68}
                                  tick={{ fontSize: 11, fill: "#475569" }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip
                                  contentStyle={chartTooltipContentStyle}
                                  formatter={(v, _n, item) => {
                                    const row = item?.payload as { full?: string; c?: number } | undefined;
                                    return [`${v}건`, row?.full ?? ""];
                                  }}
                                />
                                <Bar dataKey="c" radius={[0, 4, 4, 0]} maxBarSize={14}>
                                  {industries.map((_, idx) => (
                                    <Cell key={idx} fill={CHART_COLORS[(idx + 2) % CHART_COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-2.5 border-t border-slate-100 pt-3">
                            {industries.slice(0, 3).map((r, i) => (
                              <PremiumInsightBarRow
                                key={r.name}
                                label={r.name}
                                count={r.count}
                                max={iMax}
                                colorIndex={i + 2}
                                showShare
                                total={iTotal}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </DecisionPanel>

          <DecisionPanel
            open={deepOpen("agencies")}
            title="발주처 패턴"
            icon={<Building2 className="h-5 w-5 text-violet-600" />}
            lockMessage={`공유 시 무작위 ${SHARED_RANDOM_PANEL_COUNT}종 중 하나일 수 있습니다. 프리미엄에서 전체를 확인할 수 있습니다.`}
            accessLevel={accessLevel}
            tone="premium"
          >
            <p className="mb-3 text-xs leading-relaxed text-slate-500">
              당일 기준 발주기관(또는 상위 표본)에서 반복 노출이 큰 곳을 빠르게 짚습니다.
            </p>
            <div className="space-y-3">
              {(premiumInsights?.agencies ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">표시할 발주처 분포가 없습니다.</p>
              ) : (
                (() => {
                  const list = (premiumInsights?.agencies ?? []).slice(0, 5);
                  const aMax = maxInCounts(list);
                  return list.map((a, i) => (
                    <div key={a.name} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-800">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <PremiumInsightBarRow
                          label={a.name}
                          count={a.count}
                          max={aMax}
                          colorIndex={i + 1}
                        />
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>
          </DecisionPanel>

          <DecisionPanel
            open={deepOpen("budget_bands")}
            title="금액 구간 전략"
            icon={<Banknote className="h-5 w-5 text-emerald-600" />}
            lockMessage={`공유 시 무작위 ${SHARED_RANDOM_PANEL_COUNT}종 중 하나일 수 있습니다. 프리미엄에서 전체를 확인할 수 있습니다.`}
            accessLevel={accessLevel}
            tone="premium"
          >
            <p className="mb-3 text-xs leading-relaxed text-slate-500">
              기초금액 구간별 건수 분포로 입찰 단가·팀 구성 전략을 가늠할 수 있습니다.
            </p>
            <div className="space-y-3">
              {(premiumInsights?.budgetBands ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">금액 구간 데이터가 없습니다.</p>
              ) : (
                (() => {
                  const bands = premiumInsights?.budgetBands ?? [];
                  const bMax = maxInCounts(bands);
                  return (
                    <>
                      <div className="h-44 w-full min-w-0 sm:h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={bands}
                            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 10, fill: "#64748b" }}
                              interval={0}
                              angle={-28}
                              textAnchor="end"
                              height={68}
                            />
                            <YAxis hide domain={[0, "auto"]} />
                            <Tooltip
                              contentStyle={chartTooltipContentStyle}
                              formatter={(v) => [`${v}건`, "공고 수"]}
                            />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
                              {bands.map((b, idx) => (
                                <Cell key={b.label} fill={CHART_COLORS[(idx + 3) % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2.5 border-t border-slate-100 pt-3">
                        {bands.map((b, i) => (
                          <PremiumInsightBarRow
                            key={b.label}
                            label={b.label}
                            count={b.count}
                            max={bMax}
                            colorIndex={i + 3}
                          />
                        ))}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </DecisionPanel>
        </div>
        </div>

        <div className="relative mt-2">
          <DecisionPanel
            open={deepOpen("anomalies")}
            title="이상치·경고 히스토리"
            icon={<ShieldAlert className="h-5 w-5 text-rose-600" />}
            lockMessage={`공유 시 무작위 ${SHARED_RANDOM_PANEL_COUNT}종 중 하나일 수 있습니다. 프리미엄에서 전체를 확인할 수 있습니다.`}
            accessLevel={accessLevel}
            tone="premium"
          >
            {(premiumInsights?.anomalies?.length ?? 0) === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                  <ShieldAlert className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900">특이 경고 없음</p>
                  <p className="mt-0.5 text-sm text-emerald-800/80">
                    오늘 리포트 기준으로 눈에 띄는 리스크 플래그가 감지되지 않았습니다.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {(premiumInsights?.anomalies ?? []).map((a) => (
                  <li
                    key={a}
                    className="flex items-start gap-3 rounded-xl border border-rose-200/80 bg-gradient-to-r from-rose-50/90 to-white p-3.5 shadow-sm"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700">
                      !
                    </span>
                    <span className="text-sm font-medium leading-snug text-slate-800">{a}</span>
                  </li>
                ))}
              </ul>
            )}
          </DecisionPanel>
        </div>
      </section>

      {relatedReports.length > 0 ? <RelatedReportsSection posts={relatedReports} /> : null}

      {postId && (accessLevel === "shared" || accessLevel === "premium") && (
        <div className="mx-auto max-w-xl px-1">
          <ReportShareUnlockButton
            postId={postId}
            shareTitle={title}
            shareText={tenderTeamShareText}
            layout="compact"
          />
        </div>
      )}

      {/* 7. 푸터 안내 */}
      {/* 뉴스레터 CTA(리포트 하단) */}
      <section className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 shadow-xl sm:p-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center text-white">
          <p className="text-sm font-semibold text-white/95 sm:text-base">
            매주 청소 입찰 시장 요약을 받아보세요
          </p>
          <p className="text-xs text-white/80 sm:text-sm">
            리포트와 업계 소식을 한곳에서 이메일로 정리해드립니다.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/subscribe"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-white/90"
            >
              뉴스레터 구독하기
            </Link>
            <Link
              href="/news"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/60 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              업계 소식·리포트
            </Link>
          </div>
        </div>
      </section>

      <footer className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 p-4 shadow-lg sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md sm:h-12 sm:w-12">
            <Info className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white sm:text-lg">클린아이덱스</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-blue-100 sm:mt-2 sm:text-base">
              {isIndustryPayload
                ? "클린아이덱스는 업종관리에 등록된 업종 기준으로 입찰 공고를 매일 업데이트하고 있습니다. "
                : "클린아이덱스는 청소·소독·방역 관련 공고를 별도로 분류해 매일 업데이트하고 있습니다. "}
              <Link href="/tenders" className="underline hover:text-white">
                입찰 공고
              </Link>
              에서 지역·업종별 필터로 자세히 확인할 수 있습니다.
            </p>
            {isIndustryPayload && (
              <p className="mt-1 text-xs text-blue-200/90 sm:text-sm">
                집계 기준: 해당 일자 00:00~24:00 (KST).
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function DecisionPanel({
  open,
  title,
  icon,
  children,
  lockMessage,
  accessLevel,
  tone = "default",
}: {
  open: boolean;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  lockMessage: string;
  accessLevel: "free" | "shared" | "premium";
  tone?: "default" | "premium";
}) {
  const openSurface =
    tone === "premium"
      ? "rounded-2xl border border-white/80 bg-white/90 p-4 shadow-md shadow-violet-500/5 ring-1 ring-slate-200/60 backdrop-blur-sm sm:p-6"
      : "rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6";
  const iconWrap =
    tone === "premium"
      ? "rounded-xl bg-gradient-to-br from-slate-50 to-violet-50/80 p-2 ring-1 ring-slate-100"
      : "rounded-lg bg-slate-100 p-2";
  const titleClass = tone === "premium" ? "text-base font-bold text-slate-900" : "text-base font-semibold text-slate-900";

  if (open) {
    return (
      <article className={openSurface}>
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <span className={iconWrap}>{icon}</span>
          <h3 className={titleClass}>{title}</h3>
        </div>
        {children}
      </article>
    );
  }

  const lockedSurface =
    tone === "premium"
      ? "relative overflow-hidden rounded-2xl border border-violet-200/50 bg-violet-50/30 p-4 shadow-md sm:p-6"
      : "relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-lg sm:p-6";

  return (
    <article className={lockedSurface}>
      <div className={`mb-3 flex items-center gap-2 opacity-70 ${tone === "premium" ? "sm:mb-4" : ""}`}>
        <span className={iconWrap}>{icon}</span>
        <h3 className={titleClass}>{title}</h3>
      </div>
      <div className="blur-[2px] opacity-50">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Lock className="h-4 w-4" /> 상세 잠금
          </p>
          <p className="mt-1 text-xs text-slate-600">{lockMessage}</p>
          <div className="mt-2">
            <Link href="/subscribe" className="text-xs font-medium text-blue-600 hover:underline">
              {accessLevel === "shared" ? "프리미엄으로 전체 열기" : "공유 후 더 열기 / 프리미엄 보기"}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
