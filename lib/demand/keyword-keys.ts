export const DEMAND_KEYWORD_KEYS = ["packing", "move_in_clean"] as const;

export type DemandKeywordKey = (typeof DEMAND_KEYWORD_KEYS)[number];

/** DataLab ingest — Basket 대표 phrase (전체 목록은 keyword-baskets.ts) */
export const DEMAND_DATALAB_GROUPS: {
  key: DemandKeywordKey;
  groupName: string;
  keywords: string[];
}[] = [
  {
    key: "packing",
    groupName: "packing_basket",
    keywords: ["포장이사", "이사업체", "포장이사견적", "이삿집센터"],
  },
  {
    key: "move_in_clean",
    groupName: "move_in_basket",
    keywords: ["입주청소", "입주청소업체", "이사청소", "입주청소비용"],
  },
];

export const DEMAND_SEARCHAD_KEYWORDS: Record<DemandKeywordKey, string> = {
  packing: "포장이사",
  move_in_clean: "입주청소",
};
