import {
  getContaminantById,
  getMaterialById,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { getMergedProductById } from "@/lib/knowledge-hub/product-catalog";
import { getQuestionPlaceLabel } from "@/lib/questions/places";
import type { QuestionEntityType } from "@/lib/questions/constants";
import type { QuestionEntityLinkRow, ResolvedEntityLink } from "@/lib/questions/types";

function hrefFor(type: QuestionEntityType, id: string): string | null {
  switch (type) {
    case "product":
      return `/products/${id}`;
    case "contaminant":
      return `/pollution/${id}`;
    case "material":
      return `/materials/${id}`;
    case "place":
      return `/questions?place=${encodeURIComponent(id)}`;
    case "equipment":
      return `/equipment/${id}`;
    default:
      return null;
  }
}

function linkLabel(type: QuestionEntityType, label: string): string {
  switch (type) {
    case "product":
      return `${label} 제품정보`;
    case "contaminant":
      return `${label} 청소방법`;
    case "material":
      return `${label} 청소정보`;
    case "place":
      return `${label} 관련 질문`;
    case "equipment":
      return `${label} 장비정보`;
    default:
      return label;
  }
}

export async function resolveEntityLinks(
  links: QuestionEntityLinkRow[],
): Promise<ResolvedEntityLink[]> {
  const out: ResolvedEntityLink[] = [];
  for (const link of links) {
    const resolved = await resolveOne(link.entity_type, link.entity_id);
    if (resolved) out.push(resolved);
  }
  return out;
}

async function resolveOne(
  entity_type: QuestionEntityType,
  entity_id: string,
): Promise<ResolvedEntityLink | null> {
  if (entity_type === "product") {
    const p = await getMergedProductById(entity_id);
    if (!p || p.status === "draft") return null;
    return {
      entity_type,
      entity_id,
      label: linkLabel(entity_type, p.name),
      href: hrefFor(entity_type, entity_id),
      subtitle: p.brand,
    };
  }
  if (entity_type === "contaminant") {
    const c = getContaminantById(entity_id);
    if (!c) return null;
    return {
      entity_type,
      entity_id,
      label: linkLabel(entity_type, c.name),
      href: hrefFor(entity_type, entity_id),
    };
  }
  if (entity_type === "material") {
    const m = getMaterialById(entity_id);
    if (!m) return null;
    return {
      entity_type,
      entity_id,
      label: linkLabel(entity_type, m.name),
      href: hrefFor(entity_type, entity_id),
    };
  }
  if (entity_type === "place") {
    const name = getQuestionPlaceLabel(entity_id);
    if (!name) return null;
    return {
      entity_type,
      entity_id,
      label: linkLabel(entity_type, name),
      href: hrefFor(entity_type, entity_id),
    };
  }
  return {
    entity_type,
    entity_id,
    label: linkLabel(entity_type, entity_id),
    href: hrefFor(entity_type, entity_id),
  };
}

/** 제품 카드용 — 질문 페이지 상단 노출 */
export async function resolveProductCards(
  links: QuestionEntityLinkRow[],
): Promise<
  { id: string; name: string; brand: string; summary?: string; href: string }[]
> {
  const products = links.filter((l) => l.entity_type === "product");
  const out: { id: string; name: string; brand: string; summary?: string; href: string }[] = [];
  for (const link of products) {
    const p = await getMergedProductById(link.entity_id);
    if (!p || p.status === "draft") continue;
    out.push({
      id: p.id,
      name: p.name,
      brand: p.brand,
      summary: p.summary,
      href: `/products/${p.id}`,
    });
  }
  return out;
}
