/**
 * 카탈로그 기반 시드 — 지식 DB에서 본문·제품 목록 생성
 */
import { CATALOG_TOPICS } from "@/lib/knowledge-hub/catalog";
import { getProductById } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { dbLinkedProductIdsForPath, generateGuideBodyForTopic } from "@/lib/knowledge-hub/generate-from-db";
import type { CatalogTopic } from "@/lib/knowledge-hub/catalog";
import type { GuideBodyJson } from "@/lib/knowledge-hub/types";

export type SeedGuide = {
  guide_type: "service_method" | "service_supplies" | "problem";
  service_slug: string;
  slug: string;
  path: string;
  h1: string;
  seo_title: string;
  seo_description: string;
  body_json: GuideBodyJson;
  indexable: boolean;
  products: SeedProduct[];
};

export type SeedProduct = {
  id: string;
  display_name: string;
  source_type: "coupang" | "smartstore";
  source_url: string;
  coupang_keyword?: string;
  is_primary: boolean;
  sort_order: number;
};

function buildProductsForTopic(topic: CatalogTopic): SeedProduct[] {
  const ids = dbLinkedProductIdsForPath(topic.path);
  return ids.map((productId, i) => {
    const p = getProductById(productId);
    return {
      id: `kp-${productId}`,
      display_name: p?.name ?? productId,
      source_type: "smartstore" as const,
      source_url: `/products/${productId}`,
      is_primary: i === 0,
      sort_order: i,
    };
  });
}

export function buildSeedGuides(): SeedGuide[] {
  return CATALOG_TOPICS.map((topic) => {
    const slug = `${topic.categorySlug}-${topic.topicSlug}`;
    const guideType =
      topic.guideType === "problem"
        ? "problem"
        : topic.guideType === "service_supplies"
          ? "service_supplies"
          : "service_method";

    return {
      guide_type: guideType,
      service_slug: topic.categorySlug,
      slug,
      path: topic.path,
      h1: topic.h1,
      seo_title: topic.seoTitle,
      seo_description: topic.seoDescription,
      body_json: generateGuideBodyForTopic(topic),
      indexable: topic.indexable,
      products: buildProductsForTopic(topic),
    };
  });
}

export const SEED_GUIDES: SeedGuide[] = buildSeedGuides();

export function getSeedGuideByPath(path: string): SeedGuide | undefined {
  const topic = CATALOG_TOPICS.find((t) => t.path === path);
  if (!topic) return undefined;
  const slug = `${topic.categorySlug}-${topic.topicSlug}`;
  const guideType =
    topic.guideType === "problem"
      ? "problem"
      : topic.guideType === "service_supplies"
        ? "service_supplies"
        : "service_method";
  return {
    guide_type: guideType,
    service_slug: topic.categorySlug,
    slug,
    path: topic.path,
    h1: topic.h1,
    seo_title: topic.seoTitle,
    seo_description: topic.seoDescription,
    body_json: generateGuideBodyForTopic(topic),
    indexable: topic.indexable,
    products: buildProductsForTopic(topic),
  };
}
