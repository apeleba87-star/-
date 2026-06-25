export type MoveDealType = "jeonse" | "monthly" | "sale";
export type MoveHousingType = "apartment" | "villa" | "officetel" | "detached_multi";
export type MoveContractType = "new" | "renewal" | "unknown";

export type MoveBudgetDeal = {
  id: string;
  amount: number;
  monthlyRent?: number;
  areaSqm: number;
  dealMonth: string;
  dealDate: string;
  buildingName: string;
  contractType: MoveContractType;
  contractLabel: string;
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
