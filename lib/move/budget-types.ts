export type MoveDealType = "jeonse" | "monthly" | "sale";
export type MoveHousingType = "apartment" | "villa" | "officetel" | "oneroom";

export type MoveBudgetDeal = {
  id: string;
  amount: number;
  monthlyRent?: number;
  areaSqm: number;
  dealMonth: string;
  buildingName: string;
};

export type MoveBudgetCandidate = {
  id: string;
  sido: string;
  sigungu: string;
  dong: string;
  housingType: MoveHousingType;
  dealType: MoveDealType;
  amount: number;
  monthlyRent?: number;
  areaSqm: number;
  dealCount: number;
  recentMonth: string;
  buildingHint: string;
  representativeBuildingName?: string;
  deals?: MoveBudgetDeal[];
};
