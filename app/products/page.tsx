import Link from "next/link";
import { listProducts } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: "세정 제품 | 클린아이덱스",
  description: "전문 세정 제품 사용법·희석·주의사항.",
  path: "/products",
});

export default function ProductsHubPage() {
  const products = listProducts();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">세정 제품</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          제품별 희석·용도·주의사항과 연결 레시피를 확인하세요.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <li key={p.id}>
            <Link
              href={`/products/${p.id}`}
              className="block h-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-sm"
            >
              <span className="text-xs font-bold text-violet-700">{p.brand}</span>
              <h2 className="mt-1 text-xl font-black text-slate-900">{p.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{p.mainUse.join(" · ")}</p>
              {p.standardDilution ? (
                <p className="mt-3 text-sm font-bold text-slate-800">표준 희석: {p.standardDilution}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
