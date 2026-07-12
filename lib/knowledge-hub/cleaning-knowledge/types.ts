/** 문서·사례 출처 참조 (더미 금지 정책의 공개 엔티티에 권장) */
export type SourceRef = {
  doc: "kiehl-list" | "cleaning-cases" | "cleaning-knowledge" | "manual";
  caseId?: string;
  note?: string;
};

export type EvidenceLevel = "field_case" | "product_spec" | "principle" | "guide_draft";

export type PHType =
  | "strong_acid"
  | "acid"
  | "neutral"
  | "weak_alkaline"
  | "alkaline"
  | "strong_alkaline"
  | "oxidizing"
  | "unknown";

export type ContaminantType =
  | "organic"
  | "inorganic"
  | "mixed"
  | "microbial"
  | "surface_damage"
  | "unknown";

export type Confidence = "high" | "medium" | "low";

export type FactType =
  | "usage"
  | "dilution"
  | "procedure"
  | "caution"
  | "material_rule"
  | "principle"
  | "substitute";

export type KnowledgeSource = {
  title: string;
  author?: string;
  date?: string;
  note?: string;
};

export type KnowledgeMaterial = {
  id: string;
  name: string;
  aliases?: string[];
  riskLevel: "low" | "medium" | "high" | "very_high";
  notes?: string;
  sourceRefs?: SourceRef[];
};

export type KnowledgeContaminant = {
  id: string;
  name: string;
  type: ContaminantType;
  phDirection?: string;
  notes?: string;
  sourceRefs?: SourceRef[];
};

export type KnowledgeProduct = {
  id: string;
  brand: string;
  name: string;
  aliases?: string[];
  phType: PHType;
  phApprox?: string | null;
  summary?: string;
  mainUse: string[];
  /** 문서「적용 재질」 */
  compatibleMaterialIds?: string[];
  /** 문서「제거 가능한 오염」 */
  contaminantIds?: string[];
  /** 문서「사용 불가」재질 */
  forbiddenMaterialIds?: string[];
  placeHints?: string[];
  /** 문서에 적힌 적용 재질 원문 (표시용 — 매핑 라벨보다 우선) */
  materialsRaw?: string[];
  /** 문서에 적힌 제거 오염 원문 */
  contaminantsRaw?: string[];
  /** 문서에 적힌 사용 불가 원문 */
  forbiddenRaw?: string[];
  standardDilution?: string;
  strongDilution?: string;
  dwellTime?: string;
  packSizes?: string[];
  warnings: string[];
  confidence: Confidence;
  status?: "active" | "discontinued" | "verify" | "draft";
  /** 운영자가 넣는 판매 URL — 없으면 구매 CTA 비노출 */
  salesUrl?: string | null;
  salesLabel?: string;
  sources?: KnowledgeSource[];
  sourceRefs?: SourceRef[];
};

export type KnowledgeFact = {
  id: string;
  type: FactType;
  productId?: string;
  materialIds?: string[];
  contaminantId?: string;
  field?: string;
  dilution?: string;
  dwellTime?: string;
  tools?: string[];
  steps?: string[];
  body: string;
  warnings?: string[];
  confidence: Confidence;
  guidePaths?: string[];
  sources: KnowledgeSource[];
  sourceRefs?: SourceRef[];
};

export type KnowledgeRecipe = {
  id: string;
  slug: string;
  seoTitle: string;
  field: string;
  materialId: string;
  contaminantId: string;
  productId: string;
  /** 복수 제품 사례 시 보조 제품 */
  secondaryProductIds?: string[];
  factIds?: string[];
  caseIds?: string[];
  evidenceLevel?: EvidenceLevel;
  dilution: string;
  dwellTime: string;
  tools: string[];
  steps: string[];
  warnings: string[];
  summary: string;
  confidence: Confidence;
  guidePaths?: string[];
  sources?: KnowledgeSource[];
  sourceRefs?: SourceRef[];
};

export type KnowledgeQaCase = {
  id: string;
  question: string;
  answerSummary: string;
  relatedRecipeIds?: string[];
  relatedFactIds?: string[];
  confidence: Confidence;
  sources?: KnowledgeSource[];
  sourceRefs?: SourceRef[];
};

export type KnowledgeRule = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  confidence: Confidence;
  sources?: KnowledgeSource[];
  sourceRefs?: SourceRef[];
};

export type KnowledgeCaseEvidence = {
  id: string;
  name: string;
  categoryMajor: string;
  categoryMid?: string;
  categoryMinor?: string;
  productNames: string[];
  materialRaw?: string;
  contaminantRaw?: string;
  evidenceLevel: EvidenceLevel;
  result?: string;
  sourceRefs: SourceRef[];
};

export type CleaningKnowledgeDb = {
  version: number;
  updatedAt: string;
  materials: KnowledgeMaterial[];
  contaminants: KnowledgeContaminant[];
  products: KnowledgeProduct[];
  facts: KnowledgeFact[];
  recipes: KnowledgeRecipe[];
  qaCases: KnowledgeQaCase[];
  rules: KnowledgeRule[];
  cases?: KnowledgeCaseEvidence[];
};

export type IngestResult = {
  added: { products: number; facts: number; recipes: number; qaCases: number; rules: number };
  merged: { products: number; facts: number; recipes: number; qaCases: number; rules: number };
  skipped: number;
};
