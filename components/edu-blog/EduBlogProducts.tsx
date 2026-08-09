import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { KnowledgeProduct } from "@/lib/knowledge-hub/cleaning-knowledge/types";

type Props = {
  products: KnowledgeProduct[];
};

/** 카드 가독성: 첫 문장만, 40자 넘으면 잘라서 한 줄 안에 담는다 */
function shortenSummary(summary: string): string {
  const firstSentence = summary.split(/(?<=[.。!?！？])\s/)[0] ?? summary;
  const base = firstSentence.trim();
  return base.length > 40 ? `${base.slice(0, 40)}…` : base;
}

export default function EduBlogProducts({ products }: Props) {
  if (!products.length) return null;

  return (
    <section className="mt-12 space-y-4 border-t border-slate-200 pt-8" aria-labelledby="edu-blog-products-heading">
      <h2 id="edu-blog-products-heading" className="border-l-4 border-emerald-500 pl-3 text-xl font-black text-slate-900">
        맞는 제품
      </h2>
      <p className="text-sm text-slate-600">이 주제에 쓸 수 있는 기존 카탈로그 제품입니다.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {products.map((p) => (
          <li key={p.id}>
            <Link
              href={`/products/${p.id}`}
              className="group flex min-h-[44px] flex-col gap-1 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-md"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-slate-500">{p.brand}</span>
                  <span className="mt-0.5 block truncate font-bold text-slate-900 group-hover:text-emerald-800">
                    {p.name}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-emerald-400 group-hover:text-emerald-600" aria-hidden />
              </span>
              {p.summary ? (
                <span className="line-clamp-1 text-sm text-slate-600">
                  {shortenSummary(p.summary)}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
