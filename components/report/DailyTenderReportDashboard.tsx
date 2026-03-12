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
  const {
    count_total,
    budget_total,
    budget_label,
    region_breakdown,
    top_budget_tenders,
    deadline_soon_tenders,
    has_budget_unknown,
  } = payload;

  const topRegionShare =
    count_total > 0 && region_breakdown[0]
      ? Math.round((region_breakdown[0].count / count_total) * 1000) / 10
      : 0;

  const regionChartData = region_breakdown.slice(0, 12).map((r) => ({
    name: r.name,
    count: r.count,
    pct: count_total > 0 ? Math.round((r.count / count_total) * 1000) / 10 : 0,
  }));

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 rounded-2xl p-6 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50">
      {/* 1. 헤더 (히어로 배너) */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 shadow-2xl">
        <div
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-white/5 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
              <p className="mt-1 text-lg text-blue-100">{excerpt ?? "청소·소독·방역 입찰 요약"}</p>
              <p className="mt-2 text-xl font-medium text-blue-100">{dateLabel}</p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. 핵심 지표 카드 3개 */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border-0 bg-white p-6 shadow-lg transition-shadow duration-300 hover:shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-500">총 공고</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-4xl font-bold text-blue-600">{count_total.toLocaleString()}건</p>
          <p className="mt-2 text-xs text-slate-500">청소·소독·방역 분류 공고</p>
        </div>
        <div className="rounded-xl border-0 bg-white p-6 shadow-lg transition-shadow duration-300 hover:shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-500">총 예산</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-4xl font-bold text-emerald-600">
            {budget_total > 0 ? budget_label : "—"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {budget_total === 0
              ? "공개 예산 없음"
              : has_budget_unknown
                ? "일부 공고 예산 미공개"
                : "추정 규모"}
          </p>
        </div>
        <div className="rounded-xl border-0 bg-white p-6 shadow-lg transition-shadow duration-300 hover:shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-500">1위 지역 비중</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-4xl font-bold text-purple-600">{topRegionShare}%</p>
          <p className="mt-2 text-xs text-slate-500">
            {region_breakdown[0]?.name ?? "—"} ({region_breakdown[0]?.count ?? 0}건)
          </p>
        </div>
      </section>

      {/* 3. 지역별 분포 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
            <MapPin className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">지역별 분포</h2>
            <p className="text-sm text-slate-500">{buildRegionSummarySentence(region_breakdown)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionChartData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 12 }} />
                <YAxis tick={{ fill: "#666", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value) => [`${value != null ? Number(value) : 0}건`, "건수"]}
                  labelFormatter={(label) => `지역: ${label}`}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={48}>
                  {regionChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {region_breakdown.slice(0, 10).map((r, i) => {
              const pct = count_total > 0 ? (r.count / count_total) * 100 : 0;
              return (
                <div key={r.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      {r.name}
                    </span>
                    <span className="text-slate-600">
                      {pct.toFixed(1)}% · <span className="font-medium">{r.count}건</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
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
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
          <DollarSign className="h-8 w-8 text-emerald-600" />
          예산 상위 공고
        </h2>
        <div className="space-y-4">
          {top_budget_tenders.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              등록된 공고가 없습니다.
            </p>
          ) : (
            top_budget_tenders.map((t, i) => (
              <div
                key={i}
                className="flex gap-4 rounded-xl border-2 border-slate-200 bg-gradient-to-r from-white to-slate-50/50 p-5 transition-all duration-300 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-lg">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 transition-colors duration-300 hover:text-blue-600 line-clamp-2">
                    {t.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {t.agency}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-600">
                      <DollarSign className="h-4 w-4" />
                      {t.budgetLabel}
                    </span>
                    <span className="flex items-center gap-1 text-amber-600">
                      <Clock className="h-4 w-4" />
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
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
          <Clock className="h-8 w-8 text-amber-600" />
          마감 임박 공고
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deadline_soon_tenders.length === 0 ? (
            <p className="col-span-full rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              해당 일자 기준 마감 임박 공고가 없습니다.
            </p>
          ) : (
            deadline_soon_tenders.map((t, i) => (
              <div
                key={i}
                className="relative rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50/80 to-amber-50/80 p-4"
              >
                <span className="absolute right-3 top-3 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                  D-Day
                </span>
                <h3 className="pr-16 text-base font-semibold text-slate-900 line-clamp-2">{t.title}</h3>
                <p className="mt-1 truncate text-sm text-slate-600">{t.agency}</p>
                <p className="mt-2 text-sm font-medium text-red-600">{t.deadlineLabel}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 6. 오늘의 인사이트 */}
      <section className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-slate-50 to-blue-50/50 p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <Lightbulb className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">오늘의 인사이트</h2>
        </div>
        <div className="mt-4 rounded-lg border border-blue-100 bg-white p-4">
          <p className="text-slate-700">{insightSentence}</p>
        </div>
      </section>

      {/* 7. 푸터 안내 */}
      <footer className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
            <Info className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">클린인덱스</h3>
            <p className="mt-2 text-blue-100 leading-relaxed">
              클린인덱스는 청소·소독·방역 관련 공고를 별도로 분류해 매일 업데이트하고 있습니다.{" "}
              <Link href="/tenders" className="underline hover:text-white">
                입찰 공고
              </Link>
              에서 지역·분야별 필터로 자세히 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
