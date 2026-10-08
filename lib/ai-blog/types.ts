export type WritingStyle = "story" | "expert" | "checkpoint";
export type BlogMode = 1 | 2 | 3;
export type AttrType = "CONTAMINANT" | "MATERIAL" | "PRODUCT" | "SPACE";
export type MediaType = "BEFORE" | "AFTER" | "PROCESS" | "OTHER";
export type ContentStatus = "DRAFT" | "READY" | "DONE" | "ARCHIVED";

export type BusinessProfile = {
  company_id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  base_region: string | null;
  service_regions: string[];
  main_services: string[];
  career_years: number | null;
  intro: string | null;
  strengths: string | null;
  target_customers: string | null;
  writing_style: WritingStyle;
  cta_text: string | null;
  homepage_url: string | null;
  naver_place_url: string | null;
  banned_phrases: string[];
};

export type Project = {
  id: string;
  company_id: string;
  service_type: string;
  region_sido: string | null;
  region_sigungu: string | null;
  region_dong: string | null;
  property_type: string | null;
  area_pyeong: number | null;
  worker_count: number | null;
  work_minutes: number | null;
  price: number | null;
  work_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectAttribute = {
  id?: string;
  attr_type: AttrType;
  ref_id: string | null;
  custom_label: string | null;
};

export type ProjectMedia = {
  id: string;
  media_type: MediaType;
  sort_order: number;
  space_type: string | null;
  local_name: string;
  local_size: number | null;
  local_modified_at: string | null;
  taken_at: string | null;
  width: number | null;
  height: number | null;
};

export type MediaPair = {
  id: string;
  label: string;
  memo: string;
  before_media_id: string | null;
  after_media_id: string | null;
  sort_order: number;
};

export type ParagraphBlock = { id: string; type: "paragraph"; text: string };
export type HeadingBlock = { id: string; type: "heading"; text: string };
export type ImageBlock = {
  id: string;
  type: "image";
  media_id: string | null;
  role: "BEFORE" | "AFTER";
  pair_id: string | null;
};
export type ContentBlock = ParagraphBlock | HeadingBlock | ImageBlock;

export type ContentVariant = { intro: number; closing: number; random: boolean };

export type Content = {
  id: string;
  company_id: string;
  project_id: string;
  channel: string;
  keyword: string;
  secondary_keywords: string[];
  extra_request: string;
  mode: BlogMode | null;
  variant: ContentVariant | null;
  title: string;
  title_candidates: string[];
  blocks: ContentBlock[];
  status: ContentStatus;
  ai_model: string | null;
  prompt_version: string | null;
  generation_count: number;
  partial_rewrite_count: number;
  created_at: string;
  updated_at: string;
};

export type UsageSummary = {
  plan_code: string;
  plan_name: string;
  period: string;
  contents_used: number;
  monthly_content_limit: number;
  max_generations_per_content: number;
  max_partial_rewrites_per_content: number;
};

export type AccessState = "active" | "expired" | "suspended" | "none";

export type AiAccess = {
  state: AccessState;
  plan_code: string | null;
  expires_on: string | null;
  /** 만료일까지 남은 일수 (만료일 당일 0) */
  days_left: number | null;
};

export type KnowledgeOption = { id: string; name: string };
export type KnowledgeOptions = {
  contaminants: KnowledgeOption[];
  materials: KnowledgeOption[];
  products: KnowledgeOption[];
};

export const SERVICE_TYPES = ["입주청소", "이사청소", "거주청소", "준공청소", "사무실청소", "상가청소", "특수청소"];
export const PROPERTY_TYPES = ["아파트", "빌라", "오피스텔", "단독주택", "상가", "사무실", "기타"];
export const SPACE_TYPES = ["욕실", "주방", "거실", "방", "베란다", "창틀", "현관", "기타"];

export const WRITING_STYLE_TO_MODE: Record<WritingStyle, BlogMode> = {
  story: 1,
  expert: 2,
  checkpoint: 3,
};
