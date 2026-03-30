import Link from "next/link";
import { BarChart3, Lock } from "lucide-react";
import JobWageInsightShareButton from "@/components/jobs/JobWageInsightShareButton";
import type { NationalCompare } from "@/lib/jobs/job-wage-premium-insights";

function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

type Props = {
  reportDate: string;
  loginNextPath: string;
  unlocked: boolean;
  shareTitle: string;
  shareText: string;
  compare: NationalCompare;
  bins: { label: string; jobPostCount: number }[];
  dominantCategoryName: string | null;
  prevDominantCategoryName: string | null;
  hasPrevReport: boolean;
};

export default function JobWagePremiumInsights({
  reportDate,
  loginNextPath,
  unlocked,
  shareTitle,
  shareText,
  compare,
  bins,
  dominantCategoryName,
  prevDominantCategoryName,
  hasPrevReport,
}: Props) {
  const categoryMismatch =
    Boolean(dominantCategoryName && prevDominantCategoryName && dominantCategoryName !== prevDominantCategoryName);
  const maxBinCount = Math.max(1, ...bins.map((b) => b.jobPostCount));
  const totalInBins = bins.reduce((s, b) => s + b.jobPostCount, 0);

  return (
    <section className="rounded-3xl border-2 border-teal-200/70 bg-gradient-to-br from-teal-50/40 via-white to-emerald-50/30 p-6 shadow-md ring-1 ring-teal-100/80 sm:p-7">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/25">
          <BarChart3 className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">심화 인사이트</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">전국 가중 평균 · 전일 대비 · 구간 분포</h2>
          <p className="mt-2 text-sm text-slate-600">
            시·도마다 공고 수가 다르므로 <strong className="text-slate-800">공고 수로 가중한 전국 대표 일당</strong>과, 전일 리포트와의 차이,
            공고가 몰린 일당 구간을 함께 봅니다.
          </p>
        </div>
      </div>

      {!unlocked ? (
        <div className="mt-6 rounded-2xl border border-dashed border-teal-300/80 bg-white/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Lock className="h-4 w-4 text-teal-700" aria-hidden />
            공유 또는 구독 시 아래 수치가 표시됩니다
          </div>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
            <li>이날 직종 기준 전국 가중 평균 일당</li>
            <li>전일 리포트 대비 증감(원·%)</li>
            <li>시·도 평균을 2만원 단위로 묶은 공고 수 분포</li>
          </ul>
          <div className="mt-4">
            <JobWageInsightShareButton
              reportDate={reportDate}
              shareTitle={shareTitle}
              shareText={shareText}
              loginNextPath={loginNextPath}
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">전국 가중 평균 일당</p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">
                {compare.currAvg != null ? formatWon(compare.currAvg) : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">시·도별 (평균×공고 수) 합 / 공고 수 합</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">전일 대비</p>
              {!hasPrevReport ? (
                <p className="mt-3 text-sm text-slate-500">전일(KST) 일당 리포트가 없어 비교할 수 없습니다.</p>
              ) : compare.delta == null || compare.prevAvg == null ? (
                <p className="mt-3 text-sm text-slate-500">전일 데이터로 가중 평균을 계산할 수 없습니다.</p>
              ) : (
                <>
                  <p className="mt-2 text-lg font-bold tabular-nums text-slate-900">
                    {compare.delta >= 0 ? "+" : ""}
                    {formatWon(compare.delta)}
                    {compare.deltaPct != null && (
                      <span className="ml-2 text-base font-semibold text-teal-800">
                        ({compare.delta >= 0 ? "+" : ""}
                        {compare.deltaPct}%)
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">전일 가중 평균 {formatWon(compare.prevAvg)}</p>
                </>
              )}
              {categoryMismatch && (
                <p className="mt-3 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] leading-relaxed text-amber-950 ring-1 ring-amber-200/80">
                  전일 대표 직종({prevDominantCategoryName})과 오늘({dominantCategoryName})이 다를 수 있어, 증감은 참고용입니다.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">시·도 평균 일당 구간별 공고 수</p>
            <p className="mt-1 text-xs text-slate-500">
              각 시·도의 평균 일당이 속한 구간에 그 시·도 공고 수를 더했습니다. (합계 {totalInBins.toLocaleString("ko-KR")}건)
            </p>
            <ul className="mt-4 space-y-3">
              {bins.map((b) => (
                <li key={b.label}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-800">{b.label}</span>
                    <span className="shrink-0 tabular-nums text-slate-600">{b.jobPostCount.toLocaleString("ko-KR")}건</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
                      style={{ width: `${Math.round((b.jobPostCount / maxBinCount) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-center text-xs text-slate-500">
            입찰 리포트 심화 패널과 동일하게, 오늘 한 번 공유하면 당일 다른 화면에도 적용됩니다.{" "}
            <Link href="/subscribe" className="font-medium text-teal-700 underline">
              구독
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
