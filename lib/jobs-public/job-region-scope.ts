import {
  DEMAND_REGIONS,
  getDemandCity,
  getDemandDistrictRef,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import {
  isNationalPublicJobScope,
  NATIONAL_PUBLIC_JOB_SIDO,
} from "@/lib/jobs-public-ingest/worknet/region-parse";

export type JobPublicRegionDraft =
  | { scope: "national" }
  | { scope: "city"; cityId: string }
  | { scope: "district"; cityId: string; guSlug: string };

const DEMAND_CITY_BY_SIDO_LABEL = new Map(
  DEMAND_REGIONS.map((c) => [c.label, c] as const)
);

export function jobPublicScopeFromDraft(
  draft: JobPublicRegionDraft
): { sido: string; sigungu: string | null } {
  if (draft.scope === "national") {
    return { sido: NATIONAL_PUBLIC_JOB_SIDO, sigungu: null };
  }
  const city = getDemandCity(draft.cityId);
  if (!city) {
    return { sido: "서울", sigungu: null };
  }
  if (draft.scope === "city") {
    return { sido: city.label, sigungu: null };
  }
  const district = getDemandDistrictRef(draft.cityId, draft.guSlug);
  return {
    sido: city.label,
    sigungu: district?.gu ?? null,
  };
}

export function jobPublicDraftFromScope(scope: {
  sido: string;
  sigungu?: string | null;
}): JobPublicRegionDraft | null {
  if (isNationalPublicJobScope(scope)) {
    return { scope: "national" };
  }
  const sigungu = scope.sigungu?.trim() || null;
  const city = DEMAND_CITY_BY_SIDO_LABEL.get(scope.sido);
  if (!city) return null;
  if (!sigungu) {
    return { scope: "city", cityId: city.id };
  }
  const district = city.districts.find(
    (d) =>
      d.gu === sigungu ||
      d.gu.replace(/\s+/g, "") === sigungu.replace(/\s+/g, "")
  );
  if (!district) {
    return { scope: "city", cityId: city.id };
  }
  return { scope: "district", cityId: city.id, guSlug: district.slug };
}

export function jobPublicRegionLabelFromDraft(draft: JobPublicRegionDraft): string {
  return jobPublicRegionLabelFromScope(jobPublicScopeFromDraft(draft));
}

export function jobPublicRegionLabelFromScope(scope: {
  sido: string;
  sigungu?: string | null;
}): string {
  if (isNationalPublicJobScope(scope)) return NATIONAL_PUBLIC_JOB_SIDO;
  const sigungu = scope.sigungu?.trim() || null;
  return sigungu ? `${scope.sido} ${sigungu}` : `${scope.sido} 전체`;
}

export type JobPublicRegionCookieV2 = JobPublicRegionDraft & { v?: 2 };

export function parseJobPublicRegionCookie(raw: string | undefined): JobPublicRegionDraft {
  if (!raw?.trim()) {
    return { scope: "city", cityId: "seoul" };
  }
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    if (j.v === 2 || j.scope === "national") {
      if (j.scope === "national") return { scope: "national" };
      if (j.scope === "city" && typeof j.cityId === "string") {
        return { scope: "city", cityId: j.cityId };
      }
      if (
        j.scope === "district" &&
        typeof j.cityId === "string" &&
        typeof j.guSlug === "string"
      ) {
        return { scope: "district", cityId: j.cityId, guSlug: j.guSlug };
      }
    }
    if (typeof j.sido === "string") {
      const draft = jobPublicDraftFromScope({
        sido: j.sido,
        sigungu: typeof j.sigungu === "string" ? j.sigungu : null,
      });
      if (draft) return draft;
    }
  } catch {
    // fall through
  }
  return { scope: "city", cityId: "seoul" };
}

export function serializeJobPublicRegionDraft(draft: JobPublicRegionDraft): string {
  return JSON.stringify({ v: 2, ...draft });
}

export function jobPublicScopeFromCookie(raw: string | undefined): {
  sido: string;
  sigungu: string | null;
} {
  return jobPublicScopeFromDraft(parseJobPublicRegionCookie(raw));
}

export function jobPublicScopeFromDemandSelection(
  sel: DemandRegionSelection
): { sido: string; sigungu: string | null } {
  if (sel.scope === "national") {
    return { sido: NATIONAL_PUBLIC_JOB_SIDO, sigungu: null };
  }
  if (sel.scope === "city") {
    const city = getDemandCity(sel.cityId);
    return { sido: city?.label ?? "서울", sigungu: null };
  }
  const city = getDemandCity(sel.cityId);
  const district = getDemandDistrictRef(sel.cityId, sel.guSlug);
  return {
    sido: city?.label ?? "서울",
    sigungu: district?.gu ?? null,
  };
}
