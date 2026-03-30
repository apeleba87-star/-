/** 지도·카드에서 1~5위를 같은 색으로 맞추기 위한 팔레트(대비·구분용) */
export const WAGE_MAP_RANK_COUNT = 5 as const;

export const WAGE_MAP_RANK_META = [
  { fill: "#0f766e", name: "teal" as const },
  { fill: "#0369a1", name: "sky" as const },
  { fill: "#1d4ed8", name: "blue" as const },
  { fill: "#6d28d9", name: "violet" as const },
  { fill: "#c2410c", name: "orange" as const },
] as const;

/** 카드용 Tailwind (테두리·배경·순위 뱃지) */
export const WAGE_MAP_RANK_CARD_CLASS = [
  "border-teal-600/90 bg-teal-50/90 ring-teal-200/80",
  "border-sky-600/90 bg-sky-50/90 ring-sky-200/80",
  "border-blue-600/90 bg-blue-50/90 ring-blue-200/80",
  "border-violet-600/90 bg-violet-50/90 ring-violet-200/80",
  "border-orange-600/90 bg-amber-50/90 ring-orange-200/80",
] as const;

export const WAGE_MAP_RANK_BADGE_CLASS = [
  "bg-teal-700",
  "bg-sky-700",
  "bg-blue-700",
  "bg-violet-700",
  "bg-orange-700",
] as const;

export const WAGE_MAP_RANK_AMOUNT_CLASS = [
  "text-teal-900",
  "text-sky-900",
  "text-blue-900",
  "text-violet-900",
  "text-orange-900",
] as const;
