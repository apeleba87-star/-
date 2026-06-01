import Link from "next/link";
import DemandShell from "@/components/demand/DemandShell";
import DemandRankRow from "@/components/demand/DemandRankRow";
import ScopeBadge from "@/components/demand/ScopeBadge";
import { DEMAND_NATIONAL_KEYWORD_LABELS, formatMomPercent } from "@/lib/demand/copy";
import { DEMAND_SNAPSHOT_META, DEMAND_TOP10 } from "@/lib/demand/dummy-data";

export const metadata = {
  title: "키워드 조회 | 입주수요 | 클린아이덱스",
};

const KEYWORDS = [
  { name: "입주청소", mom: 11 },
  { name: "포장이사", mom: 27 },
  { name: "이사청소", mom: 5 },
  { name: "줄눈시공", mom: 3 },
] as const;

export default function DemandKeywordPage() {
  return (
    <DemandShell
      title="키워드 조회"
      subtitle="전국 검색지수(데이터랩)와, 거래·이동이 함께 오른 구를 연결해 봅니다."
    >
      <p className="mb-6 flex items-center gap-2 text-sm text-slate-600">
        <ScopeBadge scope="national" />
        네이버 데이터랩 검색지수(상대값) · 구별 검색지수 API 없음
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {KEYWORDS.map((k) => (
          <li
            key={k.name}
            className="rounded-2xl border border-violet-100 bg-violet-50/50 p-5 ring-1 ring-violet-100/80"
          >
            <p className="font-bold text-slate-900">{k.name}</p>
            <p className="mt-1 text-sm text-slate-600">최근 4주 · 전국</p>
            <p className="mt-2 text-2xl font-black text-violet-800">{formatMomPercent(k.mom)}</p>
          </li>
        ))}
      </ul>

      <Link
        href="/marketing-report"
        className="mt-6 inline-flex min-h-11 items-center rounded-xl border-2 border-indigo-200 bg-white px-5 text-sm font-semibold text-indigo-900 hover:bg-indigo-50"
      >
        마케팅 리포트에서 전체 키워드 보기 →
      </Link>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-slate-900">이 키워드와 함께 보면 좋은 구</h2>
        <p className="mt-1 text-sm text-slate-600">
          키워드×구 교차가 아니라, <strong>이번 달 거래·이동이 활발한 구</strong> (TOP10)입니다.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          {DEMAND_TOP10.slice(0, 5).map((d, i) => (
            <li key={d.slug} className="text-sm font-medium text-slate-800">
              <Link href={`/demand/region/${d.slug}`} className="text-teal-700 hover:underline">
                {i + 1}. {d.gu}
              </Link>
              <span className="ml-2 text-slate-500">
                전월세 {formatMomPercent(d.drivers.find((x) => x.key === "jeonse_wolse_trade")?.momPercent ?? 0)}
              </span>
            </li>
          ))}
        </ol>
        <ul className="mt-4 space-y-2">
          {DEMAND_TOP10.slice(0, 3).map((d) => (
            <li key={d.slug}>
              <DemandRankRow district={d} showRank />
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-xs text-slate-500">
        전국 {DEMAND_NATIONAL_KEYWORD_LABELS.packing}{" "}
        {formatMomPercent(DEMAND_SNAPSHOT_META.nationalKeywords.packingMom)} ·{" "}
        {DEMAND_NATIONAL_KEYWORD_LABELS.moveInClean}{" "}
        {formatMomPercent(DEMAND_SNAPSHOT_META.nationalKeywords.moveInCleanMom)} (
        {DEMAND_SNAPSHOT_META.baseMonthLabel} 기준)
      </p>
    </DemandShell>
  );
}
