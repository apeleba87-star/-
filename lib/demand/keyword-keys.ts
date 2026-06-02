export const DEMAND_KEYWORD_KEYS = ["packing", "move_in_clean"] as const;

export type DemandKeywordKey = (typeof DEMAND_KEYWORD_KEYS)[number];

export const DEMAND_DATALAB_GROUPS: {
  key: DemandKeywordKey;
  groupName: string;
  keywords: string[];
}[] = [
  { key: "packing", groupName: "packing", keywords: ["포장이사"] },
  { key: "move_in_clean", groupName: "move_in_clean", keywords: ["입주청소"] },
];

export const DEMAND_SEARCHAD_KEYWORDS: Record<DemandKeywordKey, string> = {
  packing: "포장이사",
  move_in_clean: "입주청소",
};
