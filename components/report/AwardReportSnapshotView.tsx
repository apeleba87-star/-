"use client";

import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  BarChart2,
  Users,
  Wallet,
  Percent,
  CalendarClock,
  Sparkles,
  MapPin,
  Lightbulb,
  Target,
  Building2,
} from "lucide-react";
import RelatedReportsSection from "@/components/report/RelatedReportsSection";
import type { RelatedReportPostRow } from "@/lib/content/related-report-posts";

/** 막대·차트 — 초록 일색을 피하고 인디고·바이올렛·앰버·스카이 등을 교차 */
const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#0ea5e9",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
  "#3b82f6",
  "#64748b",
];

const chartTooltipStyle = {
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  fontSize: 12,
} as const;

type Props = {
  title: string;
  excerpt?: string | null;
  content: {
    headline?: string;
    key_metrics?: string[];
    practical_note?: string;
    next_action?: string;
    data_trust?: { source?: string; sample_count?: number };
    recommendation?: {
      cluster_start: number;
      cluster_end: number;
      cluster_count: number;
      p10: number;
      p25: number;
      p50: number;
      safe_rate: number;
      normal_rate: number;
      aggressive_rate: number;
      confidence_level: "높음" | "보통" | "낮음";
    };
    industry_comparison?: {
      industry_name: string;
      award_count: number;
      avg_award_amt: number | null;
      avg_rate: number | null;
      avg_participants: number | null;
      top_region: string;
    }[];
    region_distribution?: {
      region: string;
      award_count: number;
      share_pct: number;
      avg_award_amt: number | null;
    }[];
    top_awards?: {
      rank: number;
      bid_ntce_nm: string;
      region: string;
      agency_name: string;
      industry_name: string;
      base_amt: number | null;
      award_amt: number | null;
      bid_rate_pct: number | null;
      participants: number | null;
      openg_dt: string | null;
    }[];
    out_of_scope_summary?: {
      award_count: number;
      avg_award_amt: number | null;
      avg_rate: number | null;
      avg_participants: number | null;
      regions: {
        region: string;
        award_count: number;
      }[];
    };
  };
  updatedAt?: string | null;
  relatedReports?: RelatedReportPostRow[];
};

function parseMetricValue(metrics: string[] | undefined, matcher: RegExp): string {
  if (!metrics?.length) return "—";
  const row = metrics.find((m) => matcher.test(m));
  if (!row) return "—";
  const hit = row.match(/([\d.,]+(?:~[\d.,]+)?)(%|개|건|만원)?/);
  if (!hit) return row;
  return `${hit[1]}${hit[2] ?? ""}`;
}

function AwardCountBarRow({
  label,
  count,
  max,
  colorIndex,
  total,
}: {
  label: string;
  count: number;
  max: number;
  colorIndex: number;
  total?: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;
  const share =
    total != null && total > 0 ? ((count / total) * 100).toFixed(1) : null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium text-slate-800" title={label}>
          {label}
        </span>
        <span className="shrink-0 tabular-nums text-slate-600">
          <span className="font-semibold text-slate-800">{count.toLocaleString("ko-KR")}</span>
          <span className="text-slate-400">건</span>
          {share != null && <span className="ml-1.5 text-xs text-slate-400">({share}%)</span>}
        </span>
      </div>
      <div className="h-2.5 w-full min-w-0 overflow-hidden rounded-full bg-slate-100">
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

/** 낙찰 리포트 표 래퍼 — 얇은 링·인셋 하이라이트 */
const reportTableShell =
  "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.95)] ring-1 ring-slate-900/[0.035]";

const thBase =
  "whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 first:pl-5 last:pr-5";
const thClass = `${thBase} text-left`;
const thNum = `${thBase} text-right tabular-nums`;

function RateCell({ rate }: { rate: number | null }) {
  if (rate == null) return <span className="text-slate-400">—</span>;
  const r = rate;
  const tone =
    r >= 95
      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
      : r >= 85
        ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80"
        : "bg-slate-100/90 text-slate-700 ring-1 ring-slate-200/70";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      {r.toFixed(2)}%
    </span>
  );
}

function CountBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-baseline gap-0.5 tabular-nums">
      <span className="font-semibold text-slate-900">{n.toLocaleString("ko-KR")}</span>
      <span className="text-[11px] font-medium text-slate-400">건</span>
    </span>
  );
}

/** 표·막대 비교에서는 제외하고 건수만 별도 표기 */
const OUT_OF_SCOPE_INDUSTRY_NAME = "청소관련 업종 외";

export default function AwardReportSnapshotView({ title, excerpt, content, updatedAt, relatedReports = [] }: Props) {
  const metrics = content.key_metrics ?? [];
  const sample = content.data_trust?.sample_count ?? null;
  const avgRate = parseMetricValue(metrics, /평균\s*낙찰률/);
  const avgParticipants = parseMetricValue(metrics, /평균\s*참여\s*업체수/);
  const avgAward = parseMetricValue(metrics, /평균\s*낙찰금액/);
  const dominantBand = (() => {
    const row = metrics.find((m) => /최다\s*낙찰률\s*구간/.test(m));
    if (!row) return "—";
    return row.replace(/^.*최다\s*낙찰률\s*구간\s*/, "").trim() || "—";
  })();
  const reco = content.recommendation;
  const industryRows = content.industry_comparison ?? [];
  const outScopeIndustryRow = industryRows.find((r) => r.industry_name === OUT_OF_SCOPE_INDUSTRY_NAME);
  const industryRowsRegistered = industryRows.filter((r) => r.industry_name !== OUT_OF_SCOPE_INDUSTRY_NAME);
  const regionRows = content.region_distribution ?? [];
  const topAwards = content.top_awards ?? [];
  const outScope = content.out_of_scope_summary;
  const fmtMoney = (v: number | null) => (v == null ? "—" : `${Math.round(v).toLocaleString("ko-KR")}원`);

  const industryMax = industryRowsRegistered.reduce((m, r) => Math.max(m, r.award_count), 0);
  const industryTotal = industryRowsRegistered.reduce((s, r) => s + r.award_count, 0);
  const regionMax = regionRows.reduce((m, r) => Math.max(m, r.award_count), 0);
  const regionTotal = regionRows.reduce((s, r) => s + r.award_count, 0);
  const regionChartData = regionRows.slice(0, 10).map((r) => ({
    name: r.region.length > 5 ? `${r.region.slice(0, 4)}…` : r.region,
    fullName: r.region,
    count: r.award_count,
    pct: r.share_pct,
  }));

  return (
    <div className="mx-auto min-w-0 max-w-[1400px] space-y-4 rounded-2xl bg-gradient-to-br from-slate-50 via-indigo-50/35 to-amber-50/30 p-2 xs:p-3 sm:space-y-6 sm:p-6 lg:space-y-8 lg:p-8">
      {/* 히어로 — 인디고·바이올렛·시안 그라데이션 (단일 초록 톤 회피) */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 p-4 shadow-2xl sm:p-8">
        <div
          className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl sm:-right-20 sm:-top-20 sm:h-64 sm:w-64"
          aria-hidden
        />
        <div
          className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-3xl sm:-bottom-32 sm:-left-32 sm:h-96 sm:w-96"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md sm:h-14 sm:w-14">
              <Sparkles className="h-5 w-5 text-white sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">낙찰 리포트</p>
              <h1 className="mt-1 text-xl font-bold leading-snug tracking-tight text-white sm:text-4xl">{title}</h1>
              {excerpt ? (
                <p className="mt-2 line-clamp-3 text-sm text-white/90 sm:line-clamp-none sm:text-lg">{excerpt}</p>
              ) : null}
            </div>
          </div>
          <div className="self-start rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
            등록 업종 기준 집계
          </div>
        </div>
      </header>

      {/* 한 줄 요약 — 인사이트 카드 */}
      <section
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-200/40 sm:p-5"
        aria-label="한 줄 요약"
      >
        <div className="mb-2 flex items-center gap-2">
          <div className="rounded-lg bg-amber-100 p-2">
            <Percent className="h-4 w-4 text-amber-700" aria-hidden />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">한 줄 요약</p>
        </div>
        <p className="text-sm font-medium leading-relaxed text-slate-800 sm:text-base">
          {content.headline ?? "요약 없음"}
        </p>
      </section>

      {/* KPI — 입찰 ‘오늘 한눈에’ 그리드 톤 */}
      <section
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-200/40 sm:p-5"
        aria-label="핵심 지표"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">핵심 지표</p>
          {sample != null ? (
            <p className="text-xs text-slate-400">표본 {sample.toLocaleString("ko-KR")}건</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="flex flex-col rounded-xl border border-slate-100 bg-gradient-to-br from-violet-50/90 to-white p-3.5 sm:p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Percent className="h-3.5 w-3.5 text-violet-600" aria-hidden />
              평균 낙찰률
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-violet-800 sm:text-3xl">{avgRate}</p>
          </div>
          <div className="flex flex-col rounded-xl border border-slate-100 bg-gradient-to-br from-sky-50/90 to-white p-3.5 sm:p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Users className="h-3.5 w-3.5 text-sky-600" aria-hidden />
              평균 참여 업체
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-sky-900 sm:text-3xl">{avgParticipants}</p>
          </div>
          <div className="flex flex-col rounded-xl border border-slate-100 bg-gradient-to-br from-amber-50/90 to-white p-3.5 sm:p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Wallet className="h-3.5 w-3.5 text-amber-600" aria-hidden />
              평균 낙찰금액
            </div>
            <p className="mt-2 text-lg font-bold tabular-nums leading-tight text-amber-900 sm:text-2xl">{avgAward}</p>
          </div>
          <div className="flex flex-col rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50/90 to-white p-3.5 sm:p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Target className="h-3.5 w-3.5 text-slate-600" aria-hidden />
              최다 낙찰률 구간
            </div>
            <p className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-slate-900 sm:text-xl">{dominantBand}</p>
          </div>
        </div>
      </section>

      {reco ? (
        <section className="rounded-2xl border border-indigo-200/70 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-indigo-100 p-2">
              <BarChart2 className="h-4 w-4 text-indigo-700" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">투찰 위치 추천(참고용)</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                핵심 군집 {reco.cluster_start.toFixed(2)}~{reco.cluster_end.toFixed(2)}% · 표본 {reco.cluster_count}건 ·
                신뢰도 {reco.confidence_level}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">안전</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{reco.safe_rate.toFixed(2)}%</p>
              <p className="text-[11px] text-slate-500">군집 중앙(p50) 근처</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium text-amber-800">일반</p>
              <p className="mt-1 text-2xl font-bold text-amber-900">{reco.normal_rate.toFixed(2)}%</p>
              <p className="text-[11px] text-amber-800/85">군집 하단(p25) 기준</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs font-medium text-rose-800">공격</p>
              <p className="mt-1 text-2xl font-bold text-rose-900">{reco.aggressive_rate.toFixed(2)}%</p>
              <p className="text-[11px] text-rose-800/85">군집 하단(p10) 기준</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
            <p className="tabular-nums">p10: {reco.p10.toFixed(2)}%</p>
            <p className="tabular-nums">p25: {reco.p25.toFixed(2)}%</p>
            <p className="tabular-nums">p50: {reco.p50.toFixed(2)}%</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-2 flex items-center gap-2">
          <div className="rounded-lg bg-violet-100 p-2">
            <Lightbulb className="h-4 w-4 text-violet-700" aria-hidden />
          </div>
          <h2 className="text-base font-bold text-slate-900">실무 참고</h2>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">
          {content.practical_note ?? "집계 지표를 참고해 공고 조건과 함께 최종 판단하세요."}
        </p>
        {content.next_action ? (
          <p className="mt-3 rounded-lg border border-violet-100 bg-violet-50/90 px-3 py-2 text-sm font-medium text-violet-900">
            {content.next_action}
          </p>
        ) : null}
      </section>

      {regionRows.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-cyan-100 p-2">
                <MapPin className="h-4 w-4 text-cyan-700" aria-hidden />
              </div>
              <h2 className="text-base font-bold text-slate-900">지역 분포</h2>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="min-h-0 min-w-0 space-y-3">
              {regionRows.map((r, i) => (
                <AwardCountBarRow
                  key={r.region}
                  label={r.region}
                  count={r.award_count}
                  max={regionMax}
                  colorIndex={i}
                  total={regionTotal > 0 ? regionTotal : undefined}
                />
              ))}
            </div>
            <div className="min-h-[240px] w-full min-w-0">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={regionChartData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={48} />
                  <YAxis tick={{ fontSize: 11 }} width={36} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [
                      typeof value === "number" ? `${value.toLocaleString("ko-KR")}건` : String(value ?? "—"),
                      "낙찰",
                    ]}
                    labelFormatter={(_, items) => {
                      const p = items?.[0]?.payload as { fullName?: string } | undefined;
                      return p?.fullName ?? "";
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {regionChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-indigo-100 p-2">
            <Building2 className="h-4 w-4 text-indigo-700" aria-hidden />
          </div>
          <h2 className="text-base font-bold text-slate-900">업종 비교 (등록 업종 기준)</h2>
        </div>
        {!industryRows.length ? (
          <p className="text-sm text-slate-500">업종 비교 데이터가 없습니다.</p>
        ) : (
          <>
            {industryRowsRegistered.length > 0 ? (
              <div className="space-y-3">
                {industryRowsRegistered.map((r, i) => (
                  <AwardCountBarRow
                    key={r.industry_name}
                    label={r.industry_name}
                    count={r.award_count}
                    max={industryMax}
                    colorIndex={i}
                    total={industryTotal > 0 ? industryTotal : undefined}
                  />
                ))}
              </div>
            ) : null}
            {industryRowsRegistered.length > 0 ? (
            <div className={`mt-6 hidden md:block ${reportTableShell}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-[13px] leading-snug">
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-gradient-to-b from-slate-50/98 to-slate-50/50">
                      <th scope="col" className={`${thClass} min-w-[8rem]`}>
                        업종
                      </th>
                      <th scope="col" className={thNum}>
                        낙찰건수
                      </th>
                      <th scope="col" className={thNum}>
                        평균 낙찰가
                      </th>
                      <th scope="col" className={thNum}>
                        평균 낙찰률
                      </th>
                      <th scope="col" className={thNum}>
                        평균 참여
                      </th>
                      <th scope="col" className={`${thClass} min-w-[5rem]`}>
                        주요 지역
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/90">
                    {industryRowsRegistered.map((r) => (
                      <tr
                        key={r.industry_name}
                        className="group transition-colors hover:bg-gradient-to-r hover:from-indigo-50/40 hover:to-transparent"
                      >
                        <td className="px-4 py-3.5 pl-5 font-medium text-slate-900">
                          {r.industry_name}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          <CountBadge n={r.award_count} />
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-800">
                          {fmtMoney(r.avg_award_amt)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex justify-end">
                            <RateCell rate={r.avg_rate} />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">
                          {r.avg_participants != null ? (
                            <>
                              <span className="font-medium">{r.avg_participants.toFixed(1)}</span>
                              <span className="text-xs text-slate-400">개</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3.5 pr-5 text-slate-600">
                          {r.top_region?.trim() ? (
                            <span className="inline-flex max-w-full items-center rounded-md bg-slate-100/90 px-2 py-0.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/60">
                              {r.top_region}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            ) : null}
            {outScopeIndustryRow ? (
              <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border border-dashed border-slate-300 bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                <span className="font-medium text-slate-600">{OUT_OF_SCOPE_INDUSTRY_NAME}</span>
                <span className="tabular-nums text-lg font-bold text-slate-900">
                  {outScopeIndustryRow.award_count.toLocaleString("ko-KR")}
                </span>
                <span className="text-slate-500">건</span>
                <span className="text-xs text-slate-400">(상세 표에는 미포함)</span>
              </div>
            ) : null}
            {industryRowsRegistered.length > 0 ? (
              <p className="mt-3 text-center text-xs text-slate-500 md:hidden">
                가로가 넓은 화면에서 업종 비교 표 전체 열을 볼 수 있습니다.
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-bold text-slate-900">낙찰 공고 상위 (등록 업종 기준)</h2>
        {!topAwards.length ? (
          <p className="mt-2 text-sm text-slate-500">낙찰 공고 데이터가 없습니다.</p>
        ) : (
          <>
            <ul className="mt-4 space-y-3 md:hidden">
              {topAwards.map((r) => (
                <li
                  key={`${r.rank}-${r.bid_ntce_nm}`}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex min-w-[2rem] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                      {r.rank}
                    </span>
                    <span className="text-right text-xs text-slate-500">
                      {r.openg_dt ? new Date(r.openg_dt).toLocaleDateString("ko-KR") : "—"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{r.bid_ntce_nm}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="truncate" title={r.region}>
                      {r.region}
                    </span>
                    <span className="truncate text-right" title={r.agency_name}>
                      {r.agency_name}
                    </span>
                    <span className="col-span-2 truncate text-slate-500">{r.industry_name}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-3 text-xs">
                    <div>
                      <dt className="text-slate-500">낙찰가</dt>
                      <dd className="font-semibold text-indigo-700">{fmtMoney(r.award_amt)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">낙찰률</dt>
                      <dd className="mt-0.5">
                        <RateCell rate={r.bid_rate_pct} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">기초금액</dt>
                      <dd className="tabular-nums text-slate-700">{fmtMoney(r.base_amt)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">참여</dt>
                      <dd className="tabular-nums text-slate-700">
                        {r.participants != null ? `${r.participants}개` : "—"}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
            <div className={`mt-6 hidden md:block ${reportTableShell}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-[13px] leading-snug">
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-gradient-to-b from-slate-50/98 to-slate-50/50">
                      <th scope="col" className={`${thClass} w-14`}>
                        순위
                      </th>
                      <th scope="col" className={`${thClass} min-w-[12rem]`}>
                        공고명
                      </th>
                      <th scope="col" className={`${thClass} min-w-[4rem]`}>
                        지역
                      </th>
                      <th scope="col" className={`${thClass} min-w-[7rem]`}>
                        기관
                      </th>
                      <th scope="col" className={`${thClass} min-w-[7rem]`}>
                        업종
                      </th>
                      <th scope="col" className={thNum}>
                        기초금액
                      </th>
                      <th scope="col" className={thNum}>
                        낙찰가
                      </th>
                      <th scope="col" className={thNum}>
                        낙찰률
                      </th>
                      <th scope="col" className={thNum}>
                        참여
                      </th>
                      <th scope="col" className={`${thClass} whitespace-nowrap`}>
                        개찰일
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/90">
                    {topAwards.map((r) => (
                      <tr
                        key={`${r.rank}-${r.bid_ntce_nm}`}
                        className="transition-colors hover:bg-gradient-to-r hover:from-indigo-50/40 hover:to-transparent"
                      >
                        <td className="px-4 py-3.5 pl-5">
                          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-2 py-0.5 text-xs font-bold tabular-nums text-white shadow-sm">
                            {r.rank}
                          </span>
                        </td>
                        <td className="max-w-[18rem] px-4 py-3.5 font-medium text-slate-900">
                          <span className="line-clamp-2" title={r.bid_ntce_nm}>
                            {r.bid_ntce_nm}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{r.region}</td>
                        <td className="max-w-[10rem] px-4 py-3.5 text-sm text-slate-600">
                          <span className="line-clamp-2" title={r.agency_name}>
                            {r.agency_name}
                          </span>
                        </td>
                        <td className="max-w-[10rem] px-4 py-3.5 text-sm text-slate-600">
                          <span className="line-clamp-2" title={r.industry_name}>
                            {r.industry_name}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">{fmtMoney(r.base_amt)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-indigo-700">
                          {fmtMoney(r.award_amt)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex justify-end">
                            <RateCell rate={r.bid_rate_pct} />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">
                          {r.participants != null ? (
                            <>
                              <span className="font-medium">{r.participants}</span>
                              <span className="text-xs text-slate-400">개</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 pr-5 text-slate-600 tabular-nums">
                          {r.openg_dt ? new Date(r.openg_dt).toLocaleDateString("ko-KR") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {outScope && outScope.award_count > 0 ? (
        <section className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-bold text-amber-900">청소관련 업종 외 데이터 (참고 표기만)</h2>
          <p className="mt-1 text-xs text-amber-800/90">
            아래 수치는 등록 업종 기반 계산(추천/핵심지표/비교표)에서 제외됩니다.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-2.5">
              <p className="text-xs text-slate-500">건수</p>
              <p className="font-semibold tabular-nums text-slate-900">{outScope.award_count.toLocaleString("ko-KR")}건</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-2.5">
              <p className="text-xs text-slate-500">평균 낙찰가</p>
              <p className="font-semibold tabular-nums text-slate-900">{fmtMoney(outScope.avg_award_amt)}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-2.5">
              <p className="text-xs text-slate-500">평균 낙찰률</p>
              <p className="font-semibold tabular-nums text-slate-900">
                {outScope.avg_rate != null ? `${outScope.avg_rate.toFixed(2)}%` : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-2.5">
              <p className="text-xs text-slate-500">평균 참여</p>
              <p className="font-semibold tabular-nums text-slate-900">
                {outScope.avg_participants != null ? `${outScope.avg_participants.toFixed(1)}개` : "—"}
              </p>
            </div>
          </div>
          {outScope.regions?.length ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">지역별 제외 건수</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-800">
                {outScope.regions.map((r) => (
                  <span key={r.region} className="tabular-nums">
                    {r.region} {r.award_count.toLocaleString("ko-KR")}건
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {relatedReports.length > 0 ? <RelatedReportsSection posts={relatedReports} /> : null}

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 text-xs text-slate-500">
          <p>출처: {content.data_trust?.source ?? "나라장터 낙찰 집계"}</p>
          <p>표본: {sample != null ? `${sample.toLocaleString("ko-KR")}건` : "—"}</p>
          <p className="mt-1 inline-flex items-center gap-1" suppressHydrationWarning>
            <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            갱신: {updatedAt ? new Date(updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "—"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            href="/news?section=report&category=award_report"
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            낙찰 리포트 목록
          </Link>
          <Link
            href="/tender-awards"
            className="flex min-h-[44px] items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            낙찰공고 목록
          </Link>
        </div>
      </section>
    </div>
  );
}
