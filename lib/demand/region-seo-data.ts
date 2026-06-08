import {
  buildDemandScopeRow,
  mergeRtmsDistrictOverrides,
  type DemandScopeTableRow,
} from "@/lib/demand/scope-data";
import { getDemandKeywordStoreForRegions } from "@/lib/demand/keyword-query";
import {
  getDemandRtmsDistrictMedianByYyyymm,
  getDemandRtmsDistrictSnapshot,
  getDemandRtmsSeriesForKeys,
} from "@/lib/demand/rtms-query";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";
import {
  demandDistrictRegionKey,
  formatDemandRegionLabel,
  getDemandCity,
  getDemandDistrictRef,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import { demandQueryKeysForSelections } from "@/lib/demand/selection-query-keys";
import { buildDemandScoreContext } from "@/lib/demand/seoul-demand-ranking";
import { formatMomPercent, formatSearchIndexPercent } from "@/lib/demand/copy";
import { createClient } from "@/lib/supabase-server";
import type { DemandHeatBand } from "@/lib/demand/district-demand-score";
import type { RegionAdFit } from "@/lib/demand/region-ad-fit";
import { resolveRegionAdFit } from "@/lib/demand/region-ad-fit";

export type RegionSeoNeighbor = {
  cityId: string;
  guSlug: string;
  gu: string;
  score: number;
  band: DemandHeatBand;
};

export type RegionSeoPageData = {
  cityId: string;
  guSlug: string;
  pathLabel: string;
  row: DemandScopeTableRow;
  rtmsSeries: DemandRtmsSeriesStore;
  adFit: RegionAdFit;
  insightLine: string;
  neighbors: RegionSeoNeighbor[];
  lastModified: string | null;
  indexable: boolean;
};

function districtSelection(cityId: string, guSlug: string): DemandRegionSelection {
  return { scope: "district", cityId, guSlug };
}

function nearbyDistrictRefs(cityId: string, guSlug: string, limit = 5) {
  const city = getDemandCity(cityId);
  if (!city) return [];
  const idx = city.districts.findIndex((d) => d.slug === guSlug);
  if (idx < 0) return [];
  const out: typeof city.districts = [];
  for (let offset = 1; offset < city.districts.length && out.length < limit; offset += 1) {
    if (idx - offset >= 0) out.push(city.districts[idx - offset]!);
    if (out.length < limit && idx + offset < city.districts.length) {
      out.push(city.districts[idx + offset]!);
    }
  }
  return out.slice(0, limit);
}

export function regionSeoInsightLine(row: DemandScopeTableRow, placeLabel: string): string {
  const tradeParts: string[] = [];
  if (row.jeonseMom !== 0) tradeParts.push(`전월세 ${formatMomPercent(row.jeonseMom)}`);
  if (row.saleMom !== 0) tradeParts.push(`매매 ${formatMomPercent(row.saleMom)}`);
  const moveInIdx = formatSearchIndexPercent(row.moveInClean.indexMomPercent);
  const packingIdx = formatSearchIndexPercent(row.packing.indexMomPercent);
  const trade =
    tradeParts.length > 0 ? tradeParts.join(", ") : "거래 변화는 작은 편";
  return `${placeLabel}은 ${trade}이며, 입주청소 검색 ${moveInIdx}, 이사 검색 ${packingIdx}입니다.`;
}

export function isRegionSeoIndexable(
  row: DemandScopeTableRow,
  rtmsSeries: DemandRtmsSeriesStore,
  cityId: string,
  guSlug: string
): boolean {
  const rtmsKey = `district:${demandDistrictRegionKey(cityId, guSlug)}`;
  const series = rtmsSeries[rtmsKey] ?? [];
  const hasRtms = series.some((p) => p.saleCount > 0 || p.jeonseCount > 0);
  const hasLiveSearch =
    row.keywordSource?.datalab === "live" || row.keywordSource?.volume === "live";
  const scoreOk = Number.isFinite(row.demandScore.score) && row.demandScore.score > 0;
  return scoreOk && (hasRtms || hasLiveSearch);
}

async function districtLastModified(regionKey: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("demand_rtms_monthly")
      .select("updated_at")
      .eq("region_scope", "district")
      .eq("region_key", regionKey)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.updated_at ?? null;
  } catch {
    return null;
  }
}

/** 지역 SEO 랜딩 — 단일 시·군·구 SSR 데이터 */
export async function getRegionSeoPageData(
  cityId: string,
  guSlug: string
): Promise<RegionSeoPageData | null> {
  const district = getDemandDistrictRef(cityId, guSlug);
  if (!district) return null;

  const selection = districtSelection(cityId, guSlug);
  const neighborRefs = nearbyDistrictRefs(cityId, guSlug);
  const neighborSelections = neighborRefs.map((d) => districtSelection(cityId, d.slug));
  const allSelections = [selection, ...neighborSelections];
  const { keywordRefs, rtmsKeys } = demandQueryKeysForSelections(allSelections);

  const [rtmsSnapshot, rtmsSeries, keywordStore, districtMedianByYyyymm, lastModified] =
    await Promise.all([
      getDemandRtmsDistrictSnapshot(),
      getDemandRtmsSeriesForKeys(rtmsKeys),
      getDemandKeywordStoreForRegions(keywordRefs),
      getDemandRtmsDistrictMedianByYyyymm(),
      districtLastModified(demandDistrictRegionKey(cityId, guSlug)),
    ]);

  const scoreContext = buildDemandScoreContext(
    keywordStore,
    rtmsSnapshot.baseYyyymm,
    rtmsSeries,
    rtmsSnapshot,
    districtMedianByYyyymm
  );
  const merged = mergeRtmsDistrictOverrides(rtmsSnapshot.byRegionKey, rtmsSeries);
  const row = buildDemandScopeRow(selection, merged, keywordStore, scoreContext);
  if (!row) return null;

  const pathLabel = formatDemandRegionLabel(selection) ?? district.gu;
  const neighbors: RegionSeoNeighbor[] = neighborSelections
    .map((sel) => {
      if (sel.scope !== "district") return null;
      const nRow = buildDemandScopeRow(sel, merged, keywordStore, scoreContext);
      const ref = getDemandDistrictRef(cityId, sel.guSlug);
      if (!nRow || !ref) return null;
      return {
        cityId,
        guSlug: sel.guSlug,
        gu: ref.gu,
        score: nRow.demandScore.score,
        band: nRow.demandScore.band,
      };
    })
    .filter((n): n is RegionSeoNeighbor => n != null);

  return {
    cityId,
    guSlug,
    pathLabel,
    row,
    rtmsSeries,
    adFit: resolveRegionAdFit(row),
    insightLine: regionSeoInsightLine(row, pathLabel),
    neighbors,
    lastModified,
    indexable: isRegionSeoIndexable(row, rtmsSeries, cityId, guSlug),
  };
}

/** sitemap — RTMS non-zero 지역만 */
export async function listSeoSitemapDistricts(): Promise<
  { cityId: string; guSlug: string; lastModified: string }[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("demand_rtms_monthly")
    .select("region_key, updated_at, sale_count, jeonse_count")
    .eq("region_scope", "district")
    .or("sale_count.gt.0,jeonse_count.gt.0");

  if (error || !data?.length) return [];

  const byKey = new Map<string, string>();
  for (const row of data) {
    const key = String(row.region_key);
    const ts = String(row.updated_at ?? "");
    const prev = byKey.get(key);
    if (!prev || ts > prev) byKey.set(key, ts);
  }

  const out: { cityId: string; guSlug: string; lastModified: string }[] = [];
  for (const [regionKey, lastModified] of byKey) {
    const colon = regionKey.indexOf(":");
    if (colon < 0) continue;
    const cityId = regionKey.slice(0, colon);
    const guSlug = regionKey.slice(colon + 1);
    if (!getDemandDistrictRef(cityId, guSlug)) continue;
    out.push({ cityId, guSlug, lastModified });
  }
  return out.sort((a, b) => a.cityId.localeCompare(b.cityId) || a.guSlug.localeCompare(b.guSlug));
}
