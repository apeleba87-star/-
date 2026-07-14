import { Suspense } from "react";
import {
  filterProductsForMaterial,
  listContaminants,
  listMaterials,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";
import ProductsCatalog from "@/components/knowledge-hub/ProductsCatalog";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "세정 제품 | 클린아이덱스",
  description: "전문 세정 제품 검색·용도·희석비율.",
  path: "/products",
});

export default async function ProductsHubPage() {
  const all = await listMergedProducts();

  const productIdsByMaterial: Record<string, string[]> = {};
  for (const m of listMaterials()) {
    const ids = filterProductsForMaterial(all, m.id).map((p) => p.id);
    if (ids.length) productIdsByMaterial[m.id] = ids;
  }

  const materials = listMaterials()
    .filter((m) => productIdsByMaterial[m.id]?.length)
    .map((m) => ({ id: m.id, name: m.name }));
  const contaminants = listContaminants()
    .filter((c) => all.some((p) => p.contaminantIds?.includes(c.id)))
    .map((c) => ({ id: c.id, name: c.name }));

  const products = all.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    status: p.status,
    standardDilution: p.standardDilution,
    phApprox: p.phApprox,
    contaminantsRaw: p.contaminantsRaw,
    mainUse: p.mainUse,
    compatibleMaterialIds: p.compatibleMaterialIds,
    contaminantIds: p.contaminantIds,
    aliases: p.aliases,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      <Suspense
        fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-9 w-40 rounded bg-slate-200" />
            <div className="h-12 rounded-2xl bg-slate-100" />
            <div className="h-40 rounded-3xl bg-slate-100" />
          </div>
        }
      >
        <ProductsCatalog
          products={products}
          materials={materials}
          contaminants={contaminants}
          productIdsByMaterial={productIdsByMaterial}
        />
      </Suspense>
    </div>
  );
}
