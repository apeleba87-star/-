import { Suspense } from "react";
import CasesCatalog from "@/components/knowledge-hub/CasesCatalog";
import {
  getProductById,
  listCases,
  listContaminants,
  listMaterials,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "사례 | 클린아이덱스",
  description: "재질·오염·제품별 세정 사례.",
  path: "/cases",
});

export default function CasesHubPage() {
  const rawCases = listCases();
  const categories = [...new Set(rawCases.map((c) => c.categoryMajor).filter(Boolean))].sort();

  const productIds = [...new Set(rawCases.flatMap((c) => c.productIds ?? []))];
  const products = productIds
    .map((id) => getProductById(id))
    .filter(Boolean)
    .map((p) => ({ id: p!.id, name: p!.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const materialIds = new Set(rawCases.flatMap((c) => c.materialIds ?? []));
  const contaminantIds = new Set(rawCases.flatMap((c) => c.contaminantIds ?? []));
  const materials = listMaterials()
    .filter((m) => materialIds.has(m.id))
    .map((m) => ({ id: m.id, name: m.name }));
  const contaminants = listContaminants()
    .filter((c) => contaminantIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name }));

  const cases = rawCases.map((c) => ({
    id: c.id,
    name: c.name,
    categoryMajor: c.categoryMajor,
    categoryMid: c.categoryMid,
    categoryMinor: c.categoryMinor,
    facility: c.facility,
    area: c.area,
    materialRaw: c.materialRaw,
    contaminantRaw: c.contaminantRaw,
    dilution: c.dilution,
    productNames: c.productNames ?? [],
    productIds: c.productIds,
    materialIds: c.materialIds,
    contaminantIds: c.contaminantIds,
  }));

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="page-shell py-8 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <Suspense
            fallback={
              <div className="animate-pulse space-y-4">
                <div className="h-9 w-24 rounded bg-slate-200" />
                <div className="h-12 rounded-2xl bg-slate-100" />
                <div className="h-28 rounded-2xl bg-slate-100" />
              </div>
            }
          >
            <CasesCatalog
              cases={cases}
              categories={categories}
              products={products}
              materials={materials}
              contaminants={contaminants}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
