"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
  FileText,
  Target,
  Lightbulb,
  ArrowRight,
  Users,
  MapPin,
  BarChart2,
} from "lucide-react";
import type { ReportContentBlock } from "@/lib/content/report-snapshot-types";
import { getReportTypeLabel } from "@/lib/content/report-snapshot-types";
import { getReportTheme } from "./report-snapshot-theme";

type Top3Item = {
  title?: string;
  agency?: string;
  budget?: number;
  budgetLabel?: string;
  deadline?: string;
  deadlineLabel?: string;
  prep_days?: number;
};

type Props = {
  title: string;
  excerpt?: string | null;
  sourceType: string;
  content: ReportContentBlock & { region_top3?: { name: string; count: number }[] };
};

function cell(s: unknown): string {
  if (s == null) return "—";
  const t = String(s).replace(/\|/g, "·").trim();
  return t || "—";
}

function splitMetric(text: string): { highlight: string; rest: string } {
  const m = text.match(/^(.+?)\s*([\d,.]+\s*(?:건|억|%|원|만\s*원)?)\s*$/);
  if (m) return { rest: m[1].trim(), highlight: m[2].trim() };
  const num = text.match(/([\d,.]+\s*(?:건|억|%|원|만\s*원))/);
  if (num) {
    const idx = text.indexOf(num[1]);
    return { rest: text.slice(0, idx).trim(), highlight: num[1] };
  }
  return { rest: text, highlight: "" };
}

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#c084fc"];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export default function ReportSnapshotView({
  title,
  excerpt,
  sourceType,
  content,
}: Props) {
  const {
    headline,
    key_metrics,
    region_top3,
    top3,
    practical_note,
    next_action,
    beneficiary,
    tags,
  } = content;
  const typeLabel = getReportTypeLabel(sourceType);
  const theme = getReportTheme(sourceType);
  const maxRegionCount = region_top3?.length
    ? Math.max(...region_top3.map((r) => r.count), 1)
    : 1;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={`mx-auto max-w-[1400px] space-y-4 rounded-2xl bg-gradient-to-br ${theme.pageBg} p-3 sm:space-y-6 sm:p-6`}
    >
      {/* 헤더: 리포트 유형별 그라디언트 + 배지 + 블러 장식 */}
      <motion.header
        variants={item}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${theme.headerGradient} p-4 shadow-2xl sm:p-8`}
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl sm:-right-20 sm:-top-20 sm:h-64 sm:w-64" aria-hidden />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-3xl sm:-bottom-32 sm:-left-32 sm:h-96 sm:w-96" aria-hidden />
        <div className="relative flex flex-col gap-3 sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md sm:h-14 sm:w-14">
              <BarChart2 className="h-6 w-6 text-white sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              {theme.headerBadge && (
                <span className="inline-block rounded-lg bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                  {theme.headerBadge}
                </span>
              )}
              <span className="mt-2 block text-xs font-medium uppercase tracking-wider text-white/80 sm:text-sm">
                {typeLabel}
              </span>
              <h1 className="mt-1 text-xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                {title}
              </h1>
              {excerpt && <p className="mt-2 text-sm text-white/90 sm:text-base">{excerpt}</p>}
            </div>
          </div>
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium text-white"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.header>

      {/* 한 줄 결론: 노란 테두리 + 그라디언트 배경 알림 박스 */}
      {headline && (
        <motion.section
          variants={item}
          initial="hidden"
          animate="show"
          className={`rounded-2xl border border-slate-200/80 ${theme.alertBorder} ${theme.alertBg} p-4 shadow-lg sm:p-6`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <Lightbulb className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 sm:text-lg">한 줄 결론</h2>
              <p className="mt-1.5 text-slate-700 leading-relaxed sm:text-lg">{headline}</p>
            </div>
          </div>
        </motion.section>
      )}

      {/* 핵심 수치: 처음 3개는 그라디언트 KPI 카드, 나머지는 그리드 */}
      {key_metrics && key_metrics.length > 0 && (
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <BarChart2 className="h-5 w-5 text-slate-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">핵심 수치</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {key_metrics.slice(0, 3).map((m, i) => {
              const { highlight, rest } = splitMetric(m);
              const grad = theme.kpiGradients[i];
              return (
                <motion.div
                  key={i}
                  variants={item}
                  className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${grad} p-4 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl sm:p-5`}
                >
                  <span className="absolute right-3 top-3 text-4xl font-black text-white/20 sm:text-5xl">
                    {i + 1}
                  </span>
                  <div className="relative">
                    {highlight ? (
                      <>
                        <p className="text-2xl font-bold tabular-nums sm:text-3xl">{highlight}</p>
                        {rest && <p className="mt-0.5 text-sm font-medium text-white/90">{rest}</p>}
                      </>
                    ) : (
                      <p className="text-base font-semibold sm:text-lg">{m}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          {key_metrics.length > 3 && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {key_metrics.slice(3).map((m, i) => (
                <motion.div
                  key={i}
                  variants={item}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-slate-700 transition hover:bg-slate-100"
                >
                  {m}
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* 실무 인사이트: 실무 해석 + 다음 행동 (비중 강조, TOP 3보다 상단 배치) */}
      {(practical_note || next_action || beneficiary) && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4 sm:space-y-5"
        >
          {(practical_note || next_action) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {practical_note && (
                <motion.section
                  variants={item}
                  className="rounded-2xl border-2 border-slate-200 bg-indigo-50/50 shadow-xl transition hover:shadow-2xl lg:border-l-4 lg:border-l-indigo-500 lg:bg-white"
                >
                  <div className="flex items-start gap-4 p-5 sm:p-6">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.infoGradients[0]} text-white shadow-md`}
                    >
                      <Lightbulb className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold text-slate-900 sm:text-xl">실무 해석</h2>
                      <p className="mt-3 text-base leading-relaxed text-slate-700 sm:text-lg">
                        {practical_note}
                      </p>
                    </div>
                  </div>
                </motion.section>
              )}
              {next_action && (
                <motion.section
                  variants={item}
                  className="rounded-2xl border-2 border-slate-200 bg-sky-50/50 shadow-xl transition hover:shadow-2xl lg:border-l-4 lg:border-l-sky-500 lg:bg-white"
                >
                  <div className="flex items-start gap-4 p-5 sm:p-6">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.infoGradients[1]} text-white shadow-md`}
                    >
                      <ArrowRight className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold text-slate-900 sm:text-xl">다음 행동</h2>
                      <p className="mt-3 text-base leading-relaxed text-slate-700 sm:text-lg">
                        {next_action}
                      </p>
                    </div>
                  </div>
                </motion.section>
              )}
            </div>
          )}
          {beneficiary && (
            <motion.section
              variants={item}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg transition hover:shadow-md sm:p-5"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.infoGradients[2]} text-white`}
                >
                  <Users className="h-5 w-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">유리한 대상</h2>
              </div>
              <p className="mt-2 text-slate-700 leading-relaxed text-sm sm:text-base">{beneficiary}</p>
            </motion.section>
          )}
        </motion.div>
      )}

      {/* 지역 TOP 3: 진행률 바 + Recharts 바 차트 */}
      {region_top3 && region_top3.length > 0 && (
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
              <MapPin className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">지역 TOP 3</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              {region_top3.map((r, i) => (
                <motion.div
                  key={i}
                  variants={item}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{cell(r.name)}</span>
                    <span className="font-semibold tabular-nums text-slate-600">{r.count}건</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(r.count / maxRegionCount) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="h-48 w-full min-w-0 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={region_top3.map((r) => ({ name: r.name, count: r.count }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value) => [`${value}건`, "건수"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {region_top3.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.section>
      )}

      {/* 예산 상위 공고 TOP 3: 금/은/동 배지 + 호버 */}
      {top3 && top3.length > 0 && (
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">예산 상위 공고 TOP 3</h2>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="w-16 px-3 py-3 font-semibold text-slate-700">순위</th>
                  <th className="px-3 py-3 font-semibold text-slate-700">공고명</th>
                  <th className="px-3 py-3 font-semibold text-slate-700">발주기관</th>
                  <th className="px-3 py-3 font-semibold text-slate-700 text-right">예산</th>
                  <th className="px-3 py-3 font-semibold text-slate-700">마감</th>
                </tr>
              </thead>
              <tbody>
                {(top3 as Top3Item[]).map((t, i) => (
                  <motion.tr
                    key={i}
                    variants={item}
                    className="border-t border-slate-200 transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${theme.rankBadges[i]} text-xs font-bold text-white shadow-sm`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-3 font-medium text-slate-800 sm:max-w-xs">
                      {cell(t.title)}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-3 text-slate-600 sm:max-w-[180px]">
                      {cell(t.agency)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-800">
                      {cell(t.budgetLabel ?? (t.budget != null ? String(t.budget) : ""))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {cell(t.deadlineLabel ?? t.deadline)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            <Link href="/tenders" className="text-blue-600 hover:underline">
              입찰 공고 목록
            </Link>
            에서 전체 공고를 확인할 수 있습니다.
          </p>
        </motion.section>
      )}

      {/* CTA: 인디고→보라 그라디언트, 주/보조 버튼 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className={`rounded-2xl bg-gradient-to-r ${theme.ctaGradient} p-6 shadow-xl sm:p-8`}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm font-medium text-white/90 sm:text-base">
            입찰 공고를 확인하고 참여할 수 있습니다.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/tenders"
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-lg transition hover:scale-105 ${theme.ctaPrimary}`}
            >
              <Target className="h-4 w-4" />
              입찰 공고 보기
            </Link>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-white/80 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              업계 소식·리포트
            </Link>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-white/80">
          클린아이덱스는 등록 업종 기준 청소·방역 입찰 정보를 제공합니다.
        </p>
      </motion.section>
    </motion.div>
  );
}
