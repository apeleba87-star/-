import type { KnowledgeProduct } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { listProductsForMaterial } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";

export type ProductUseGroupId =
  | "glass"
  | "bath-limescale"
  | "kitchen-grease"
  | "floor-wood"
  | "specialty"
  | "other";

export type ProductUseGroup = {
  id: ProductUseGroupId;
  title: string;
  /** 문서 연결 ID·키워드로만 판별 — 임의 분류 문구 없음 */
  match: (p: KnowledgeProduct) => boolean;
};

/**
 * 둘러보기용 그룹. 매칭은 contaminantIds / compatibleMaterialIds / materialsRaw / contaminantsRaw / mainUse 문서 필드만 사용.
 */
export const PRODUCT_USE_GROUPS: ProductUseGroup[] = [
  {
    id: "glass",
    title: "유리·방수 표면",
    match: (p) =>
      (p.compatibleMaterialIds ?? []).includes("glass") ||
      (p.materialsRaw ?? []).some((m) => /유리|거울|방수/.test(m)) ||
      /유리|글라스|Glas/i.test(p.name),
  },
  {
    id: "bath-limescale",
    title: "욕실·도기·석회/비누",
    match: (p) => {
      const c = p.contaminantIds ?? [];
      const m = p.compatibleMaterialIds ?? [];
      return (
        c.includes("limescale") ||
        c.includes("lime-deposit") ||
        c.includes("soap-scum") ||
        c.includes("water-spot") ||
        m.includes("porcelain") ||
        m.includes("enamel") ||
        (p.contaminantsRaw ?? []).some((t) => /요석|석회|비누|물때/.test(t))
      );
    },
  },
  {
    id: "kitchen-grease",
    title: "주방 기름·탄때",
    match: (p) => {
      const c = p.contaminantIds ?? [];
      return (
        c.includes("grease") ||
        c.includes("burnt-residue") ||
        (p.contaminantsRaw ?? []).some((t) => /기름|탄|후드|오븐/.test(t)) ||
        (p.mainUse ?? []).some((t) => /주방|후드|오븐/.test(t))
      );
    },
  },
  {
    id: "floor-wood",
    title: "바닥·목재",
    match: (p) => {
      const m = p.compatibleMaterialIds ?? [];
      return (
        m.includes("laminate-wood") ||
        m.includes("epoxy-floor") ||
        m.includes("pvc-deco") ||
        (p.materialsRaw ?? []).some((t) => /마루|목재|바닥|파케|라미네이트/.test(t)) ||
        /파케|토르반|베리프롭|클라리다|리바/i.test(p.name)
      );
    },
  },
  {
    id: "specialty",
    title: "특수(접착·잉크·녹·철분)",
    match: (p) => {
      const c = p.contaminantIds ?? [];
      return (
        c.includes("adhesive") ||
        c.includes("paint-residue") ||
        c.includes("rust") ||
        c.includes("stain-discoloration") ||
        (p.contaminantsRaw ?? []).some((t) => /접착|스티커|매직|녹|철분|펜|잉크/.test(t))
      );
    },
  },
];

/** 제품당 첫 매칭 그룹에만 배치 (중복 나열 방지). 미매칭은 other */
export function groupProductsForBrowse(products: KnowledgeProduct[]): {
  id: ProductUseGroupId;
  title: string;
  products: KnowledgeProduct[];
}[] {
  const buckets = new Map<ProductUseGroupId, KnowledgeProduct[]>();
  for (const g of PRODUCT_USE_GROUPS) buckets.set(g.id, []);
  buckets.set("other", []);

  for (const p of products) {
    const hit = PRODUCT_USE_GROUPS.find((g) => g.match(p));
    buckets.get(hit?.id ?? "other")!.push(p);
  }

  const ordered: { id: ProductUseGroupId; title: string; products: KnowledgeProduct[] }[] = PRODUCT_USE_GROUPS.map(
    (g) => ({
      id: g.id,
      title: g.title,
      products: sortProducts(buckets.get(g.id) ?? []),
    })
  );

  const other = buckets.get("other") ?? [];
  if (other.length) {
    ordered.push({ id: "other", title: "기타", products: sortProducts(other) });
  }

  return ordered.filter((g) => g.products.length > 0);
}

function sortProducts(list: KnowledgeProduct[]) {
  return [...list].sort((a, b) => {
    const ad = a.status === "draft" ? 1 : 0;
    const bd = b.status === "draft" ? 1 : 0;
    if (ad !== bd) return ad - bd;
    return a.name.localeCompare(b.name, "ko");
  });
}

export function filterProductsByProblem(
  products: KnowledgeProduct[],
  materialId?: string | null,
  contaminantId?: string | null
): KnowledgeProduct[] {
  const allowedByMaterial = materialId
    ? new Set(listProductsForMaterial(materialId).map((p) => p.id))
    : null;

  return products.filter((p) => {
    if (allowedByMaterial && !allowedByMaterial.has(p.id)) return false;
    if (contaminantId && !(p.contaminantIds ?? []).includes(contaminantId)) return false;
    return true;
  });
}
