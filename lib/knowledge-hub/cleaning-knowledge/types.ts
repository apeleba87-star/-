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
};

export type KnowledgeContaminant = {
  id: string;
  name: string;
  type: ContaminantType;
  phDirection?: string;
  notes?: string;
};

export type KnowledgeProduct = {
  id: string;
  brand: string;
  name: string;
  phType: PHType;
  phApprox?: string | null;
  mainUse: string[];
  standardDilution?: string;
  strongDilution?: string;
  dwellTime?: string;
  warnings: string[];
  confidence: Confidence;
  status?: "active" | "discontinued" | "verify";
  sources?: KnowledgeSource[];
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
};

export type KnowledgeRecipe = {
  id: string;
  slug: string;
  seoTitle: string;
  field: string;
  materialId: string;
  contaminantId: string;
  productId: string;
  factIds?: string[];
  dilution: string;
  dwellTime: string;
  tools: string[];
  steps: string[];
  warnings: string[];
  summary: string;
  confidence: Confidence;
  guidePaths?: string[];
  sources?: KnowledgeSource[];
};

export type KnowledgeQaCase = {
  id: string;
  question: string;
  answerSummary: string;
  relatedRecipeIds?: string[];
  relatedFactIds?: string[];
  confidence: Confidence;
  sources?: KnowledgeSource[];
};

export type KnowledgeRule = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  confidence: Confidence;
  sources?: KnowledgeSource[];
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
};

export type IngestResult = {
  added: { products: number; facts: number; recipes: number; qaCases: number; rules: number };
  merged: { products: number; facts: number; recipes: number; qaCases: number; rules: number };
  skipped: number;
};
