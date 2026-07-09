import Link from "next/link";
import { listMaterials } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { RISK_LEVEL_KO } from "@/lib/knowledge-hub/korean-labels";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: "재질별 청소 | 클린아이덱스",
  description: "타일·유리·스테인레스 등 재질별 세정 방법과 주의사항.",
  path: "/materials",
});

export default function MaterialsHubPage() {
  const materials = listMaterials();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">재질별 청소</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          재질 특성에 맞는 제품·레시피를 선택하세요. 위험도가 높은 재질은 사전 테스트가 필수입니다.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {materials.map((m) => (
          <li key={m.id}>
            <Link
              href={`/materials/${m.id}`}
              className="block h-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
            >
              <h2 className="text-xl font-black text-slate-900">{m.name}</h2>
              <p className="mt-2 text-sm text-slate-600">
                위험도: <span className="font-bold">{RISK_LEVEL_KO[m.riskLevel] ?? m.riskLevel}</span>
              </p>
              {m.notes ? <p className="mt-2 line-clamp-2 text-sm text-slate-500">{m.notes}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
