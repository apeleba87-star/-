"use client";

import Link from "next/link";
import { BarChart2, Users, Wallet, Percent, CalendarClock } from "lucide-react";

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
};

function parseMetricValue(metrics: string[] | undefined, matcher: RegExp): string {
  if (!metrics?.length) return "—";
  const row = metrics.find((m) => matcher.test(m));
  if (!row) return "—";
  const hit = row.match(/([\d.,]+(?:~[\d.,]+)?)(%|개|건|만원)?/);
  if (!hit) return row;
  return `${hit[1]}${hit[2] ?? ""}`;
}

export default function AwardReportSnapshotView({ title, excerpt, content, updatedAt }: Props) {
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
  const topAwards = content.top_awards ?? [];
  const outScope = content.out_of_scope_summary;
  const fmtMoney = (v: number | null) => (v == null ? "—" : `${Math.round(v).toLocaleString("ko-KR")}원`);

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/60 p-4 sm:p-6">
      <section className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-5 text-white shadow-xl sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white/20 p-2.5">
            <BarChart2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">낙찰 리포트</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {excerpt ? <p className="mt-2 text-sm text-white/90 sm:text-base">{excerpt}</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200/70 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Percent className="h-4 w-4 text-amber-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-800">한 줄 요약</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700 sm:text-base">{content.headline ?? "요약 없음"}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">평균 낙찰률</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{avgRate}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">평균 참여 업체수</p>
          <p className="mt-1 flex items-center gap-1 text-2xl font-bold text-teal-700">
            <Users className="h-4 w-4" />
            {avgParticipants}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">평균 낙찰금액</p>
          <p className="mt-1 flex items-center gap-1 text-2xl font-bold text-cyan-700">
            <Wallet className="h-4 w-4" />
            {avgAward}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">최다 구간</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{dominantBand}</p>
        </div>
      </section>

      {reco ? (
        <section className="rounded-2xl border border-emerald-200/70 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-bold text-slate-900">투찰 위치 추천(참고용)</h2>
          <p className="mt-1 text-xs text-slate-500">
            핵심 군집 {reco.cluster_start.toFixed(2)}~{reco.cluster_end.toFixed(2)}% · 표본 {reco.cluster_count}건 ·
            신뢰도 {reco.confidence_level}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">안전</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{reco.safe_rate.toFixed(2)}%</p>
              <p className="text-[11px] text-slate-500">군집 중앙(p50) 근처</p>
            </div>
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
              <p className="text-xs text-teal-700">일반</p>
              <p className="mt-1 text-2xl font-bold text-teal-800">{reco.normal_rate.toFixed(2)}%</p>
              <p className="text-[11px] text-teal-700/80">군집 하단(p25) 기준</p>
            </div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
              <p className="text-xs text-cyan-700">공격</p>
              <p className="mt-1 text-2xl font-bold text-cyan-800">{reco.aggressive_rate.toFixed(2)}%</p>
              <p className="text-[11px] text-cyan-700/80">군집 하단(p10) 기준</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
            <p>p10: {reco.p10.toFixed(2)}%</p>
            <p>p25: {reco.p25.toFixed(2)}%</p>
            <p>p50: {reco.p50.toFixed(2)}%</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-bold text-slate-900">실무 참고</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{content.practical_note ?? "집계 지표를 참고해 공고 조건과 함께 최종 판단하세요."}</p>
        {content.next_action ? <p className="mt-2 text-sm font-medium text-teal-700">{content.next_action}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-bold text-slate-900">업종 비교표 (등록 업종 기준)</h2>
        {!industryRows.length ? (
          <p className="mt-2 text-sm text-slate-500">업종 비교 데이터가 없습니다.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2.5 font-semibold">업종</th>
                  <th className="px-3 py-2.5 font-semibold text-right">낙찰건수</th>
                  <th className="px-3 py-2.5 font-semibold text-right">평균 낙찰가</th>
                  <th className="px-3 py-2.5 font-semibold text-right">평균 낙찰률</th>
                  <th className="px-3 py-2.5 font-semibold text-right">평균 참여</th>
                  <th className="px-3 py-2.5 font-semibold">주요 지역</th>
                </tr>
              </thead>
              <tbody>
                {industryRows.map((r) => (
                  <tr key={r.industry_name} className="border-t border-slate-100">
                    <td className="px-3 py-2.5 font-medium text-slate-900">{r.industry_name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.award_count.toLocaleString("ko-KR")}건</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtMoney(r.avg_award_amt)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.avg_rate != null ? `${r.avg_rate.toFixed(2)}%` : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.avg_participants != null ? `${r.avg_participants.toFixed(1)}개` : "—"}</td>
                    <td className="px-3 py-2.5">{r.top_region}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-bold text-slate-900">낙찰 공고 상세표 (등록 업종 기준)</h2>
        {!topAwards.length ? (
          <p className="mt-2 text-sm text-slate-500">낙찰 공고 데이터가 없습니다.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2.5 font-semibold">랭킹</th>
                  <th className="px-3 py-2.5 font-semibold">공고명</th>
                  <th className="px-3 py-2.5 font-semibold">지역</th>
                  <th className="px-3 py-2.5 font-semibold">기관</th>
                  <th className="px-3 py-2.5 font-semibold">업종</th>
                  <th className="px-3 py-2.5 font-semibold text-right">기초금액</th>
                  <th className="px-3 py-2.5 font-semibold text-right">낙찰가</th>
                  <th className="px-3 py-2.5 font-semibold text-right">낙찰률</th>
                  <th className="px-3 py-2.5 font-semibold text-right">참여</th>
                  <th className="px-3 py-2.5 font-semibold">개찰일</th>
                </tr>
              </thead>
              <tbody>
                {topAwards.map((r) => (
                  <tr key={`${r.rank}-${r.bid_ntce_nm}`} className="border-t border-slate-100">
                    <td className="px-3 py-2.5 tabular-nums font-semibold text-slate-900">#{r.rank}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{r.bid_ntce_nm}</td>
                    <td className="px-3 py-2.5">{r.region}</td>
                    <td className="px-3 py-2.5">{r.agency_name}</td>
                    <td className="px-3 py-2.5">{r.industry_name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtMoney(r.base_amt)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-teal-700">{fmtMoney(r.award_amt)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.bid_rate_pct != null ? `${r.bid_rate_pct.toFixed(2)}%` : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.participants != null ? `${r.participants}개` : "—"}</td>
                    <td className="px-3 py-2.5">{r.openg_dt ? new Date(r.openg_dt).toLocaleDateString("ko-KR") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {outScope && outScope.award_count > 0 ? (
        <section className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-bold text-amber-900">청소관련 업종 외 데이터 (참고 표기만)</h2>
          <p className="mt-1 text-xs text-amber-800/90">
            아래 수치는 등록 업종 기반 계산(추천/핵심지표/비교표)에서 제외됩니다.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">건수</p>
              <p className="font-semibold tabular-nums text-slate-900">{outScope.award_count.toLocaleString("ko-KR")}건</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">평균 낙찰가</p>
              <p className="font-semibold tabular-nums text-slate-900">{fmtMoney(outScope.avg_award_amt)}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">평균 낙찰률</p>
              <p className="font-semibold tabular-nums text-slate-900">
                {outScope.avg_rate != null ? `${outScope.avg_rate.toFixed(2)}%` : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
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

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-slate-500">
          <p>출처: {content.data_trust?.source ?? "나라장터 낙찰 집계"}</p>
          <p>표본: {sample != null ? `${sample.toLocaleString("ko-KR")}건` : "—"}</p>
          <p className="mt-1 inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" />
            갱신: {updatedAt ? new Date(updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/news?category=award_report" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            낙찰 리포트 목록
          </Link>
          <Link href="/tender-awards" className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            낙찰·개찰 목록
          </Link>
        </div>
      </section>
    </div>
  );
}

