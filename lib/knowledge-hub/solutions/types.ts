/**
 * Search-intent solution pages (place × space × part × contaminant).
 * Only allowlisted seed rows are published — no cartesian explosion.
 */

export type SolutionPlaceId =
  | "home"
  | "shop"
  | "office"
  | "hospital"
  | "school"
  | "public"
  | "childcare";

export type SolutionSpaceId =
  | "bathroom"
  | "restroom"
  | "kitchen"
  | "living"
  | "bedroom"
  | "entrance"
  | "balcony"
  | "laundry"
  | "utility"
  | "windows"
  | "study"
  | "dressroom"
  | "pantry"
  | "office-floor"
  | "waiting"
  | "clinic";

export type SolutionPartId =
  | "toilet"
  | "urinal"
  | "sink"
  | "faucet"
  | "mirror"
  | "shower-booth"
  | "bathtub"
  | "silicone"
  | "grout"
  | "tile"
  | "ceiling"
  | "fan"
  | "floor"
  | "drain"
  | "hood"
  | "countertop"
  | "carpet"
  | "desk"
  | "chair"
  | "glass-door"
  | "blind"
  | "pvc-mat"
  | "play-equipment"
  | "window"
  | "sash-rail"
  | "screen"
  | "aircon"
  | "wallpaper"
  | "shoe-cabinet"
  | "mattress"
  | "sofa"
  | "lighting"
  | "molding"
  | "outlet"
  | "door-frame"
  | "closet";

export type SolutionStatus = "draft" | "published";

export type SolutionPart = {
  id: SolutionPartId;
  name: string;
  defaultMaterialId?: string;
  aliases?: string[];
};

export type SolutionPlace = {
  id: SolutionPlaceId;
  name: string;
};

export type SolutionSpace = {
  id: SolutionSpaceId;
  name: string;
};

/** Contaminant master: product defaults + shared guide copied onto place pages */
export type ContaminantMasterExt = {
  contaminantId: string;
  defaultProductIds: string[];
  baseGuide?: string;
  warnings?: string[];
};

export type MaterialContaminantMaster = {
  id: string;
  materialId: string;
  contaminantId: string;
  recipeSlugs?: string[];
  notes?: string;
  warnings?: string[];
};

/** 1–5 star rating used on solution detail UI + SEO snippets */
export type SolutionStarRating = 1 | 2 | 3 | 4 | 5;

export type SolutionRecommendProduct = {
  /** catalog product when available; omit for generic labels (예: 구연산) */
  productId?: string;
  label: string;
  rating: SolutionStarRating;
  /** 표준 희석 등 표시용 (예: 1:100). 마스터 불러오기 시 제품 standardDilution으로 채움 */
  dilution?: string;
};

/**
 * Structured body for the simplified solution detail layout.
 * Seeded per allowlisted page; assemble() falls back when fields are missing.
 */
export type SolutionDetailBody = {
  /** 한줄 요약 (식별·진단용) */
  summary?: string;
  /** 오염 난이도 별점 */
  difficulty?: SolutionStarRating;
  /** 발생 위치 */
  locations?: string[];
  /** 추천 세제 (별점 순) */
  recommendations?: SolutionRecommendProduct[];
  /** 제거 방법 단계 */
  methodSteps?: string[];
  /** 주의사항 (짧게) */
  cautions?: string[];
  /** 제거가 안 될 때 — 오인 진단 후보 */
  ifFails?: string[];
};

/**
 * path: /solutions/{place}/{space}/{part}/{slug}
 * slug defaults to contaminantId; split when one contaminant maps to two intents
 */
export type SolutionPage = {
  id: string;
  placeId: SolutionPlaceId;
  spaceId: SolutionSpaceId;
  partId: SolutionPartId;
  contaminantId: string;
  slug: string;
  materialId?: string;
  title: string;
  description?: string;
  placeContext?: string;
  productIds?: string[];
  materialContaminantId?: string;
  detail?: SolutionDetailBody;
  status: SolutionStatus;
};

export type SolutionsDb = {
  version: number;
  updatedAt: string;
  places: SolutionPlace[];
  spaces: SolutionSpace[];
  parts: SolutionPart[];
  contaminantMasters: ContaminantMasterExt[];
  materialContaminants: MaterialContaminantMaster[];
  pages: SolutionPage[];
};
