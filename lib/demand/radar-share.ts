import type { DemandMetricId } from "@/lib/demand/metrics";
import {
  demandRegionSelectionKey,
  formatDemandRegionLabel,
  getDemandCity,
  getDemandDistrictRef,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import type { DemandUsageAccess } from "@/lib/demand/usage-limits";
import { isDemandRegionKeyUnlocked } from "@/lib/demand/usage-limits";

/** 공유 URL `?r=` — national | city:id | cityId:guSlug | district:city:guSlug */
export function parseRadarShareParam(raw: string | null | undefined): DemandRegionSelection | null {
  const r = raw?.trim();
  if (!r) return null;
  if (r === "national") return { scope: "national" };
  if (r.startsWith("city:")) {
    const cityId = r.slice("city:".length);
    return getDemandCity(cityId) ? { scope: "city", cityId } : null;
  }
  if (r.startsWith("district:")) {
    const rest = r.slice("district:".length);
    const colon = rest.indexOf(":");
    if (colon <= 0) return null;
    const cityId = rest.slice(0, colon);
    const guSlug = rest.slice(colon + 1);
    return getDemandDistrictRef(cityId, guSlug)
      ? { scope: "district", cityId, guSlug }
      : null;
  }
  const colon = r.indexOf(":");
  if (colon <= 0) return null;
  const cityId = r.slice(0, colon);
  const guSlug = r.slice(colon + 1);
  if (!getDemandDistrictRef(cityId, guSlug)) return null;
  return { scope: "district", cityId, guSlug };
}

export function buildRadarShareParam(sel: DemandRegionSelection): string {
  if (sel.scope === "national") return "national";
  if (sel.scope === "city") return `city:${sel.cityId}`;
  return `${sel.cityId}:${sel.guSlug}`;
}

export function formatRadarShareRegionLabel(sel: DemandRegionSelection): string | null {
  return formatDemandRegionLabel(sel);
}

export function radarShareTeaserKeyFromParam(raw: string | null | undefined): string | null {
  const sel = parseRadarShareParam(raw);
  return sel ? demandRegionSelectionKey(sel) : null;
}

const TEASER_METRICS = new Set<DemandMetricId>(["demandScore", "jeonse", "sale"]);

export function isRadarShareTeaserMetric(metricId: DemandMetricId): boolean {
  return TEASER_METRICS.has(metricId);
}

/** 공유 링크 티저 — 점수·RTMS 거래만 (검색·그래프 제외) */
export function isRadarMetricBlinded(
  access: DemandUsageAccess,
  rowKey: string,
  metricId: DemandMetricId,
  shareTeaserKey: string | null
): boolean {
  if (access.tier === "admin") return false;
  if (access.tier === "member") {
    return !isDemandRegionKeyUnlocked(access, rowKey);
  }
  if (shareTeaserKey === rowKey && isRadarShareTeaserMetric(metricId)) return false;
  return true;
}

export function isRadarChartBlinded(
  access: DemandUsageAccess,
  rowKey: string,
  _shareTeaserKey: string | null
): boolean {
  if (access.tier === "admin") return false;
  if (access.tier === "member") return !isDemandRegionKeyUnlocked(access, rowKey);
  return true;
}

export function isRadarRowFullyBlinded(
  access: DemandUsageAccess,
  rowKey: string,
  shareTeaserKey: string | null
): boolean {
  if (access.tier === "admin") return false;
  if (access.tier === "member") return !isDemandRegionKeyUnlocked(access, rowKey);
  return shareTeaserKey !== rowKey;
}

export function buildRadarShareUrl(origin: string, sel: DemandRegionSelection, channel: string): string {
  const url = new URL("/", origin);
  url.searchParams.set("r", buildRadarShareParam(sel));
  url.searchParams.set("ref", "radar_share");
  url.searchParams.set("channel", channel);
  return url.toString();
}

export { buildRadarShareCopy, type RadarShareCopy, type RadarShareCopyInput } from "@/lib/demand/radar-share-copy";
