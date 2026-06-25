import { REPORT_TYPE_DEMAND_SALES_REGION } from "@/lib/content/report-snapshot-types";

export type DemandSalesReportScope = { kind: "national" } | { kind: "city"; cityId: string };

export const DEMAND_SALES_REGION_RUN_TYPE = "demand_sales_region_report";

export const DEFAULT_DEMAND_SALES_REPORT_SCOPES: DemandSalesReportScope[] = [
  { kind: "national" },
  { kind: "city", cityId: "seoul" },
  { kind: "city", cityId: "gyeonggi" },
  { kind: "city", cityId: "incheon" },
];

export function demandSalesScopeKey(scope: DemandSalesReportScope): string {
  return scope.kind === "city" ? scope.cityId : "national";
}

export function demandSalesPostSlug(periodKey: string): string {
  return `report-${REPORT_TYPE_DEMAND_SALES_REGION.replace(/_/g, "-")}-${periodKey.replace(/[:\s]/g, "-")}`;
}

export function parseDemandSalesScope(raw: string | null | undefined): DemandSalesReportScope | null {
  const value = raw?.trim();
  if (!value || value === "national") return { kind: "national" };
  if (/^[a-z0-9-]+$/i.test(value)) return { kind: "city", cityId: value };
  return null;
}

export function demandSalesReportDescription(title: string): string {
  return `${title}. 입주레이더 검색량과 RTMS 거래 신호로 청소업체가 이번 달 확인할 영업 후보 지역을 정리했습니다.`;
}
