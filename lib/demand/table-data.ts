import {
  compositeInputsFromTableMoms,
  computeDemandCompositeIndex,
} from "@/lib/demand/composite-index";
import { DEMAND_SNAPSHOT_META, DEMAND_TOP10, getDemandDistrictBySlug } from "@/lib/demand/dummy-data";
import { SEOUL_GU_NAMES, guNameToSlug } from "@/lib/demand/slugs";

export type DemandTableSortKey =
  | "gu"
  | "packing"
  | "jeonse"
  | "sale"
  | "moveInClean"
  | "index";

export type DemandDistrictTableRow = {
  gu: string;
  slug: string;
  indexScore: number | null;
  hasDetail: boolean;
  packingMom: number;
  jeonseMom: number;
  saleMom: number;
  jeonseCount: number;
  saleCount: number;
  moveInCleanMom: number;
  /** 검색 2열: 더미 구별 변동 vs 전국 동일 */
  packingIsNational: boolean;
  moveInIsNational: boolean;
};

function driverField(
  district: ReturnType<typeof getDemandDistrictBySlug>,
  key: "packing_search" | "jeonse_wolse_trade" | "sale_trade" | "move_in_clean_search"
): { mom: number; count: number | null } {
  const d = district?.drivers.find((x) => x.key === key);
  return { mom: d?.momPercent ?? 0, count: d?.monthCount ?? null };
}

function pseudoTradeCount(slug: string, kind: "jeonse" | "sale"): number {
  let h = 0;
  const salt = kind === "jeonse" ? 5 : 7;
  for (let i = 0; i < slug.length; i += 1) h = (Math.imul(h, 31) + slug.charCodeAt(i) * salt) | 0;
  const base = kind === "jeonse" ? 200 : 90;
  const spread = kind === "jeonse" ? 280 : 150;
  return base + (Math.abs(h) % spread);
}

function pseudoMom(slug: string, salt: number, spread = 18): number {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) h = (Math.imul(h, 31) + slug.charCodeAt(i) * salt) | 0;
  return (Math.abs(h) % (spread * 2 + 1)) - spread;
}

function tableRowCompositeScore(moms: {
  packingMom: number;
  moveInCleanMom: number;
  jeonseMom: number;
  saleMom: number;
}): number {
  return computeDemandCompositeIndex(compositeInputsFromTableMoms(moms));
}

function rowFromDistrict(d: (typeof DEMAND_TOP10)[0]): DemandDistrictTableRow {
  const packing = driverField(d, "packing_search");
  const jeonse = driverField(d, "jeonse_wolse_trade");
  const sale = driverField(d, "sale_trade");
  const moveIn = driverField(d, "move_in_clean_search");
  return {
    gu: d.gu,
    slug: d.slug,
    indexScore: tableRowCompositeScore({
      packingMom: packing.mom,
      moveInCleanMom: moveIn.mom,
      jeonseMom: jeonse.mom,
      saleMom: sale.mom,
    }),
    hasDetail: true,
    packingMom: packing.mom,
    jeonseMom: jeonse.mom,
    saleMom: sale.mom,
    jeonseCount: jeonse.count ?? pseudoTradeCount(d.slug, "jeonse"),
    saleCount: sale.count ?? pseudoTradeCount(d.slug, "sale"),
    moveInCleanMom: moveIn.mom,
    packingIsNational: false,
    moveInIsNational: false,
  };
}

function rowFromSlug(gu: string, slug: string): DemandDistrictTableRow {
  const baseP = DEMAND_SNAPSHOT_META.nationalKeywords.packingMom;
  const baseM = DEMAND_SNAPSHOT_META.nationalKeywords.moveInCleanMom;
  const packingMom = baseP + pseudoMom(slug, 3);
  const jeonseMom = pseudoMom(slug, 5, 12);
  const saleMom = pseudoMom(slug, 7, 10);
  const moveInCleanMom = baseM + pseudoMom(slug, 11);
  return {
    gu,
    slug,
    indexScore: tableRowCompositeScore({ packingMom, moveInCleanMom, jeonseMom, saleMom }),
    hasDetail: false,
    packingMom,
    jeonseMom,
    saleMom,
    jeonseCount: pseudoTradeCount(slug, "jeonse"),
    saleCount: pseudoTradeCount(slug, "sale"),
    moveInCleanMom,
    packingIsNational: false,
    moveInIsNational: false,
  };
}

/** 서울 25구 · 4지표 한 행 (Phase 0 더미) */
export function buildDemandTableRows(): DemandDistrictTableRow[] {
  const topBySlug = new Map(DEMAND_TOP10.map((d) => [d.slug, d]));
  return SEOUL_GU_NAMES.map((gu) => {
    const slug = guNameToSlug(gu);
    if (!slug) throw new Error(`slug missing: ${gu}`);
    const top = topBySlug.get(slug);
    return top ? rowFromDistrict(top) : rowFromSlug(gu, slug);
  });
}

export const DEMAND_TABLE_ROWS = buildDemandTableRows();

export function demandIndexScoreBySlug(slug: string): number | null {
  return DEMAND_TABLE_ROWS.find((r) => r.slug === slug)?.indexScore ?? null;
}
