import {
  getCleaningKnowledgeDb,
  getContaminantById,
  getMaterialById,
  getProductById,
  listMaterials,
  listProductsForMaterial,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import type {
  KnowledgeMaterial,
  KnowledgeProduct,
  KnowledgeRecipe,
} from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { getMergedMaterialSurfaceGuide } from "@/lib/knowledge-hub/materials/get-merged-guides";
import type { MaterialSurfaceGuide } from "@/lib/knowledge-hub/materials/guides";
import { getSolutionPath, listSolutionPages } from "@/lib/knowledge-hub/solutions/get-solutions";

export type MaterialProductCard = {
  id: string;
  brand: string;
  name: string;
  href: string;
  phApprox?: string | null;
  dilution: string;
  tags: string[];
  tip?: string | null;
};

export type MaterialContaminantCard = {
  id: string;
  name: string;
  href: string;
  severity: string;
  prescription: string;
  recipeHref?: string | null;
};

export type MaterialRecipeCard = {
  id: string;
  title: string;
  slug: string;
  href: string;
  dilution: string;
  note: string;
  chips: string[];
};

export type MaterialExploreLink = {
  href: string;
  title: string;
  subtitle?: string;
  riskLevel?: KnowledgeMaterial["riskLevel"];
};

export type MaterialSolutionLink = {
  href: string;
  title: string;
  note?: string;
};

export type MaterialDetailData = {
  material: KnowledgeMaterial;
  guide: MaterialSurfaceGuide | null;
  intro: string;
  products: MaterialProductCard[];
  contaminants: MaterialContaminantCard[];
  recipes: MaterialRecipeCard[];
  solutions: MaterialSolutionLink[];
  moreLinks: MaterialSolutionLink[];
  nextMaterials: MaterialExploreLink[];
  stats: {
    productCount: number;
    contaminantCount: number;
    recipeCount: number;
    solutionCount: number;
  };
};

function shortName(name: string): string {
  return name.replace(/\s*[((（][^)）]*[)）]\s*/g, "").trim() || name;
}

function productCard(p: KnowledgeProduct): MaterialProductCard {
  const tip = p.warnings.filter(Boolean)[0] ?? null;
  return {
    id: p.id,
    brand: p.brand,
    name: shortName(p.name),
    href: `/products/${p.id}`,
    phApprox: p.phApprox,
    dilution: p.standardDilution ?? "표기 확인",
    tags: (p.contaminantsRaw ?? []).filter(Boolean).slice(0, 3),
    tip,
  };
}

function severityForContaminant(id: string): string {
  if (/grease|burnt|adhesive|paint|rust|mold/.test(id)) return "빠를수록";
  if (/water-spot|soap|lime|limescale|construction/.test(id)) return "즉시";
  return "확인";
}

export async function getMaterialDetailData(
  materialId: string,
  opts?: { from?: string | null }
): Promise<MaterialDetailData | null> {
  const material = getMaterialById(materialId);
  if (!material) return null;

  const guide = (await getMergedMaterialSurfaceGuide(materialId)) ?? null;
  const db = getCleaningKnowledgeDb();
  const recipes = db.recipes.filter((r) => r.materialId === materialId);
  const products = listProductsForMaterial(materialId);

  const contaminantIds = [...new Set(recipes.map((r) => r.contaminantId).filter(Boolean))];
  const contaminants: MaterialContaminantCard[] = contaminantIds.flatMap((cid) => {
    const c = getContaminantById(cid);
    if (!c) return [];
    const recipe = recipes.find((r) => r.contaminantId === cid);
    const product = recipe ? getProductById(recipe.productId) : undefined;
    const prescription = recipe
      ? `처방: ${shortName(product?.name ?? "")} ${recipe.dilution}${
          recipe.tools?.[0] ? `, ${recipe.tools[0]}` : ""
        }`.trim()
      : c.notes?.slice(0, 48) || `${c.name} 제거 방법 확인`;
    return [
      {
        id: cid,
        name: c.name,
        href: `/pollution/${cid}`,
        severity: severityForContaminant(cid),
        prescription,
        recipeHref: recipe ? `/cleaning/${recipe.slug}` : null,
      },
    ];
  });

  const recipeCards: MaterialRecipeCard[] = recipes.slice(0, 8).map((r: KnowledgeRecipe) => {
    const product = getProductById(r.productId);
    const cont = getContaminantById(r.contaminantId);
    return {
      id: r.id,
      title: shortName(product?.name ?? r.seoTitle),
      slug: r.slug,
      href: `/cleaning/${r.slug}`,
      dilution: r.dilution,
      note: r.dwellTime
        ? `${r.dwellTime}`
        : r.tools?.slice(0, 2).join(" · ") || r.summary.slice(0, 40),
      chips: [material.name.split("·")[0]!.trim(), cont?.name, r.field].filter(Boolean) as string[],
    };
  });

  const solutions = listSolutionPages()
    .filter((p) => p.materialId === materialId)
    .slice(0, 12)
    .map((p) => ({
      href: getSolutionPath(p),
      title: p.title,
      note: p.placeId ? "장소·처방" : undefined,
    }));

  const allMaterials = listMaterials();
  const currentIdx = allMaterials.findIndex((m) => m.id === materialId);
  const rotated =
    currentIdx >= 0
      ? [...allMaterials.slice(currentIdx + 1), ...allMaterials.slice(0, currentIdx)]
      : allMaterials;
  const nextMaterials: MaterialExploreLink[] = rotated
    .filter((m) => m.id !== opts?.from)
    .slice(0, 6)
    .map((m) => ({
      href: `/materials/${m.id}`,
      title: m.name,
      riskLevel: m.riskLevel,
      subtitle:
        m.riskLevel === "very_high" || m.riskLevel === "high"
          ? "고위험"
          : m.riskLevel === "low"
            ? "안전"
            : "주의",
    }));

  return {
    material,
    guide,
    intro:
      "이 페이지는 재질을 다치지 않게 쓰기 위한 안내입니다. 오염 제거 순서는 「오염으로 찾기」를 이용하세요.",
    products: products.map(productCard),
    contaminants,
    recipes: recipeCards,
    solutions,
    moreLinks: [
      {
        href: "/pollution",
        title: "오염으로 찾기 — 세제·희석·제거",
        note: "묻은 것을 지울 때",
      },
      {
        href: "/places",
        title: "장소별 청소 방법 — 루틴·걸레질",
        note: "동선·주기로 할 때",
      },
    ],
    nextMaterials,
    stats: {
      productCount: products.length,
      contaminantCount: contaminants.length,
      recipeCount: recipes.length,
      solutionCount: solutions.length,
    },
  };
}
