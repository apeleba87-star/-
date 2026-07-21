import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { KnowledgeProduct } from "@/lib/knowledge-hub/cleaning-knowledge/types";

type Props = {
  products: KnowledgeProduct[];
};

export default function EduBlogProducts({ products }: Props) {
  if (!products.length) return null;

  return (
    <section className="mt-10 space-y-4" aria-labelledby="edu-blog-products-heading">
      <h2 id="edu-blog-products-heading" className="text-lg font-black text-slate-900">
        맞는 제품
      </h2>
      <p className="text-sm text-slate-600">이 주제에 쓸 수 있는 기존 카탈로그 제품입니다.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {products.map((p) => (
          <li key={p.id}>
            <Link
              href={`/products/${p.id}`}
              className="group flex min-h-[44px] flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <span className="flex items-start justify-between gap-2">
                <span>
                  <span className="block text-xs font-medium text-slate-500">{p.brand}</span>
                  <span className="mt-0.5 block font-bold text-slate-900 group-hover:text-teal-800">
                    {p.name}
                  </span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-600" aria-hidden />
              </span>
              {p.summary ? (
                <span className="line-clamp-2 text-sm leading-relaxed text-slate-600">{p.summary}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
