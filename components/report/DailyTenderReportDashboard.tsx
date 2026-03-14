"use client";

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
  DollarSign,
  MapPin,
  Building2,
  Clock,
  Lightbulb,
  Info,
  BarChart2,
} from "lucide-react";
import type { DailyTenderPayload } from "@/lib/content/tender-report-queries";
import { buildRegionSummarySentence } from "@/lib/content/tender-report-formatters";

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

type Props = {
  payload: DailyTenderPayload;
  title: string;
  dateLabel: string;
  insightSentence: string;
  excerpt?: string | null;
};

export default function DailyTenderReportDashboard({
  payload,
  title,
  dateLabel,
  insightSentence,
  excerpt,
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

  const regionChartData = region_breakdown.slice(0, 12).map((r) => ({
    name: r.name,
    count: r.count,
    pct: count_total > 0 ? Math.round((r.count / count_total) * 1000) / 10 : 0,
  }));

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 rounded-2xl p-3 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50 sm:space-y-6 sm:p-6">
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
        </div>
      </header>

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
        {isIndustryPayload && top_industry ? (
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
                  .map((r, i) => ({ name: r.industry_name, value: r.count, index: i, count: r.count }))
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
                          const radius = Number(outerRadius) + 24;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
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
                              textAnchor={x >= Number(cx) ? "start" : "end"}
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
                          {pct.toFixed(1)}% · <span className="font-medium">{r.count}건</span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 sm:h-2">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
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
              {buildRegionSummarySentence(region_breakdown)}
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
              const pct = count_total > 0 ? (r.count / count_total) * 100 : 0;
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
                      {pct.toFixed(1)}% · <span className="font-medium">{r.count}건</span>
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
            <DollarSign className="h-6 w-6 text-emerald-600 sm:h-8 sm:w-8" />
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
            top_budget_tenders.map((t, i) => (
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
                      <DollarSign className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                      {t.budgetLabel}
                    </span>
                    <span className="flex items-center gap-1 text-amber-600">
                      <Clock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                      {t.deadlineLabel}
                    </span>
                  </div>
                </div>
              </div>
            ))
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
            deadline_soon_tenders.map((t, i) => (
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
            ))
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

      {/* 7. 푸터 안내 */}
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
                집계 기준: 해당 일자 00:00~24:00 (KST). 출처: 나라장터 G2B.
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
