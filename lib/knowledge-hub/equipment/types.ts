import type { Confidence, SourceRef } from "@/lib/knowledge-hub/cleaning-knowledge/types";

/** 대형 / 중형·수작업 / 소모품 / 액세서리 */
export type EquipmentCategoryId = "heavy" | "hand" | "consumable" | "accessory";

export type EquipmentCategory = {
  id: EquipmentCategoryId;
  name: string;
  blurb: string;
  sort: number;
};

/** 카탈로그 골격 항목(아직 상세 없을 수 있음) */
export type EquipmentCatalogItem = {
  id: string;
  categoryId: EquipmentCategoryId;
  name: string;
  aliases?: string[];
  /** planned = 골격만, draft = 작성중, active = 공개 */
  status: "planned" | "draft" | "active";
};

/**
 * 장비 마스터 — 세제 KnowledgeProduct와 평행하되
 * 「판단·작업 연결」 필드를 중심으로 둔다 (쇼핑 스펙표 X).
 */
export type KnowledgeEquipment = {
  id: string;
  categoryId: EquipmentCategoryId;
  name: string;
  aliases?: string[];
  /** 한 줄 요약 */
  summary: string;
  /** 장비란? */
  whatIs: string;
  /** 어디에 사용하는가 */
  placeHints: string[];
  /** 어떤 작업에 필요한가 */
  jobHints: string[];
  /** 선택 기준 */
  selectionCriteria: string[];
  /** 사용방법 단계 */
  useSteps: string[];
  /** 초보 실수 */
  beginnerMistakes: string[];
  warnings: string[];
  /** 연결: 세제·오염·재질·다른 장비 */
  relatedProductIds?: string[];
  relatedEquipmentIds?: string[];
  contaminantIds?: string[];
  materialIds?: string[];
  placeJobHints?: string[];
  imageUrl?: string | null;
  imageAlt?: string | null;
  confidence: Confidence;
  status: "active" | "draft" | "planned";
  sourceRefs?: SourceRef[];
};

/**
 * 장비 종류(습식청소기) 아래의 브랜드·기종.
 * 쇼핑 스펙표가 아니라 「현장에서 보는 대표 모델」 판단용.
 */
export type KnowledgeEquipmentModel = {
  id: string;
  /** 상위 장비 종류 id (예: wet-vac) */
  equipmentId: string;
  brand: string;
  name: string;
  aliases?: string[];
  summary: string;
  /** 이런 현장에 잘 맞음 */
  bestFor: string[];
  /** 고를 때 메모 */
  selectionNotes: string[];
  /** 주의·한계 */
  cautions: string[];
  /** 관련 소모품·액세서리 장비 id */
  relatedEquipmentIds?: string[];
  imageUrl?: string | null;
  imageAlt?: string | null;
  salesUrl?: string | null;
  salesLabel?: string | null;
  confidence: Confidence;
  status: "active" | "draft" | "planned";
  sourceRefs?: SourceRef[];
};
