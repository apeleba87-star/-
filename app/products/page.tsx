import {
  listContaminants,
  listMaterials,
  listProducts,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import ProductsCatalog from "@/components/knowledge-hub/ProductsCatalog";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "세정 제품 | 클린아이덱스",
  description: "전문 세정 제품 검색·용도·희석비율.",
  path: "/products",
});

type Props = {
  searchParams: Promise<{ material?: string; contaminant?: string }>;
};

export default async function ProductsHubPage({ searchParams }: Props) {
  const sp = await searchParams;
  const all = listProducts();
  const materials = listMaterials()
    .filter((m) => all.some((p) => p.compatibleMaterialIds?.includes(m.id)))
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
      <ProductsCatalog
        products={products}
        materials={materials}
        contaminants={contaminants}
        initialMaterial={sp.material}
        initialContaminant={sp.contaminant}
      />
    </div>
  );
}
