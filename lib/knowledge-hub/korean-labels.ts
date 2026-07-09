import type { ContaminantType } from "@/lib/knowledge-hub/cleaning-knowledge/types";

export const RISK_LEVEL_KO: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  very_high: "매우 높음",
};

export const CONTAMINANT_TYPE_KO: Record<ContaminantType, string> = {
  organic: "유기 오염",
  inorganic: "무기 오염",
  mixed: "복합 오염",
  microbial: "미생물(곰팡이 등)",
  surface_damage: "표면 손상",
  unknown: "미분류",
};

export const PH_DIRECTION_KO: Record<string, string> = {
  acidic: "산성 세정 유리",
  alkaline: "알칼리 세정 유리",
};
