/** @see docs/knowledge-hub-phase0-scope.md */

export type GuideType = "service_method" | "service_supplies" | "problem";

export type GuideBlockTone = "default" | "summary" | "caution" | "examples";

export type GuideSectionBlock = {
  id: string;
  type: "section";
  title: string;
  paragraphs: string[];
  tone?: GuideBlockTone;
};

export type GuideChecklistBlock = {
  id: string;
  type: "checklist";
  title: string;
  items: string[];
};

export type GuideStepsBlock = {
  id: string;
  type: "steps";
  title: string;
  steps: { title: string; body: string }[];
};

export type GuideFaqBlock = {
  id: string;
  type: "faq";
  title: string;
  items: { q: string; a: string }[];
};

export type GuideProductsBlock = {
  id: string;
  type: "products";
  title: string;
};

export type GuideRecipesBlock = {
  id: string;
  type: "recipes";
  title: string;
  recipeSlugs: string[];
  subtitle?: string;
};

export type GuideBlock =
  | GuideSectionBlock
  | GuideChecklistBlock
  | GuideStepsBlock
  | GuideFaqBlock
  | GuideProductsBlock
  | GuideRecipesBlock;

export type GuideBodyJson = {
  intro?: string;
  summary?: string[];
  toc?: string[];
  blocks: GuideBlock[];
  relatedPaths?: string[];
};

export type KnowledgeProductRow = {
  id: string;
  guide_id: string;
  block_id: string;
  display_name: string;
  source_type: "coupang" | "smartstore";
  source_url: string;
  coupang_keyword: string | null;
  image_url: string | null;
  price_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type CleaningGuideRow = {
  id: string;
  guide_type: GuideType;
  service_slug: string;
  slug: string;
  path: string;
  h1: string;
  seo_title: string;
  seo_description: string;
  body_json: GuideBodyJson;
  indexable: boolean;
  published_at: string | null;
  updated_at: string;
};

export type CleaningGuideWithProducts = CleaningGuideRow & {
  products: KnowledgeProductRow[];
};

export type InquiryType = "regular" | "move_in";
