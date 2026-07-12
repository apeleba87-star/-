import Link from "next/link";
import type { KnowledgeCaseEvidence } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import {
  caseHeadline,
  casePlaceLabel,
  caseResultLabel,
  evidenceLevelLabel,
} from "@/lib/knowledge-hub/case-display";

type Props = {
  cases: KnowledgeCaseEvidence[];
  productId?: string;
  embedLimit?: number;
};

function CaseBlock({ c }: { c: KnowledgeCaseEvidence }) {
  const place = casePlaceLabel(c);
  const headline = caseHeadline(c);
  const result = caseResultLabel(c);

  return (
    <li className="border-t border-slate-100 first:border-t-0">
      <Link href={`/cases/${c.id}`} className="block min-h-[44px] px-4 py-3.5 transition hover:bg-slate-50 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">{c.categoryMajor || "현장"}</span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs font-semibold text-slate-400">{evidenceLevelLabel(c.evidenceLevel)}</span>
        </div>
        <p className="mt-1.5 text-base font-black leading-snug text-slate-950 break-keep">{headline}</p>
        <p className="mt-1 text-sm text-slate-500">{place}</p>
        {c.dilution ? (
          <p className="mt-2 text-base">
            <span className="text-slate-500">희석</span>{" "}
            <span className="font-black text-slate-900">{c.dilution}</span>
          </p>
        ) : null}
        {result ? <p className="mt-1 text-sm text-slate-600">{result}</p> : null}
      </Link>
    </li>
  );
}

/** 제품 상세 임베드 — 최대 embedLimit개 + 전체 사례 링크 */
export default function ProductCasesEmbed({ cases, productId, embedLimit = 3 }: Props) {
  if (!cases.length) return null;
  const visible = cases.slice(0, embedLimit);
  const more = cases.length - visible.length;
  const listHref = productId ? `/cases?product=${encodeURIComponent(productId)}` : "/cases";

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <h2 className="text-lg font-black text-slate-950">사례</h2>
        <p className="mt-1 text-sm text-slate-500">유사 현장 기록 · 조건에 따라 다를 수 있습니다</p>
      </div>
      <ul>
        {visible.map((c) => (
          <CaseBlock key={c.id} c={c} />
        ))}
      </ul>
      <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
        <Link href={listHref} className="inline-flex min-h-[44px] items-center text-sm font-bold text-teal-800 hover:underline">
          {more > 0 ? `${more}개 더 · 전체 사례` : "전체 사례 보기"}
        </Link>
      </div>
    </section>
  );
}
