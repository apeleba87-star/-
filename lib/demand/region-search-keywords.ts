import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";
import type { DemandRegionSelection } from "@/lib/demand/regions";
import { getDemandCity, getDemandDistrictRef } from "@/lib/demand/regions";
import { guSlugToName } from "@/lib/demand/slugs";

export type DemandKeywordRegionRef = {
  regionScope: "national" | "city" | "district";
  regionKey: string;
};

/** DB·스토어 조회 키 */
export function demandKeywordRegionStoreKey(ref: DemandKeywordRegionRef): string {
  return `${ref.regionScope}:${ref.regionKey}`;
}

export function demandKeywordRegionRefFromSelection(
  selection: DemandRegionSelection
): DemandKeywordRegionRef | null {
  if (selection.scope === "national") {
    return { regionScope: "national", regionKey: "kr" };
  }
  if (selection.scope === "city") {
    return { regionScope: "city", regionKey: selection.cityId };
  }
  if (selection.scope === "district") {
    return {
      regionScope: "district",
      regionKey: `${selection.cityId}:${selection.guSlug}`,
    };
  }
  return null;
}

/**
 * 시·군 접미사 제거 (안동시→안동, 청송군→청송). 구 단위는 그대로(강서구).
 */
export function stripSiGunSuffix(label: string): string {
  const t = label.trim();
  if (t.endsWith("특별시") || t.endsWith("광역시")) {
    return t.replace(/특별시$|광역시$/, "").trim() || t;
  }
  if (t.endsWith("시") && !t.endsWith("특별시")) {
    return t.slice(0, -1).trim() || t;
  }
  if (t.endsWith("군")) {
    return t.slice(0, -1).trim() || t;
  }
  return t;
}

function keywordSuffix(keywordKey: DemandKeywordKey): string {
  return keywordKey === "packing" ? "포장이사" : "입주청소";
}

/** 구·시 + 키워드 (검색광고 API 호환 — 띄어쓰기 없음). 예: 강북구입주청소, 강북구포장이사 */
export function buildDistrictKeywordPhrase(guName: string, keywordKey: DemandKeywordKey): string {
  return `${guName.trim()}${keywordSuffix(keywordKey)}`;
}

/** UI 표시용 — 강북구입주청소 → 강북구 입주청소 */
export function formatRegionSearchPhraseDisplay(compactPhrase: string): string {
  const t = compactPhrase.trim();
  if (t.endsWith("입주청소") && t.length > "입주청소".length) {
    return `${t.slice(0, -"입주청소".length)} 입주청소`;
  }
  if (t.endsWith("포장이사") && t.length > "포장이사".length) {
    return `${t.slice(0, -"포장이사".length)} 포장이사`;
  }
  return t;
}

/**
 * 지역·키워드 유형별 DataLab/검색광고 조회 문구 (띄어쓰기 없음).
 * - 구: `{구명}입주청소` / `{구명}포장이사` (예: 강북구입주청소 · 강북구포장이사)
 * - 시: `서울입주청소` / `서울포장이사`
 * - 전국: `입주청소` / `포장이사`
 */
export function buildRegionSearchPhrase(
  selection: DemandRegionSelection,
  keywordKey: DemandKeywordKey
): string | null {
  const suffix = keywordSuffix(keywordKey);

  if (selection.scope === "national") {
    return suffix;
  }

  const city = getDemandCity(selection.cityId);
  if (!city) return null;

  if (selection.scope === "city") {
    const core = stripSiGunSuffix(city.label);
    return `${core}${suffix}`;
  }

  const district = getDemandDistrictRef(selection.cityId, selection.guSlug);
  const gu = district?.gu ?? guSlugToName(selection.guSlug);
  if (!gu) return null;

  return buildDistrictKeywordPhrase(gu, keywordKey);
}

export function buildRegionSearchPhrases(
  selection: DemandRegionSelection
): { packing: string; moveInClean: string } | null {
  const packing = buildRegionSearchPhrase(selection, "packing");
  const moveInClean = buildRegionSearchPhrase(selection, "move_in_clean");
  if (!packing || !moveInClean) return null;
  return { packing, moveInClean };
}

/** 서울 25구 ingest 대상 */
export function listSeoulDistrictKeywordTargets(): Array<{
  regionScope: "district";
  regionKey: string;
  guSlug: string;
  guName: string;
  phrases: { packing: string; moveInClean: string };
}> {
  const city = getDemandCity("seoul");
  if (!city) return [];

  return city.districts.map((d) => {
    const selection = {
      scope: "district" as const,
      cityId: "seoul",
      guSlug: d.slug,
    };
    const phrases = buildRegionSearchPhrases(selection)!;
    return {
      regionScope: "district" as const,
      regionKey: `seoul:${d.slug}`,
      guSlug: d.slug,
      guName: d.gu,
      phrases,
    };
  });
}
