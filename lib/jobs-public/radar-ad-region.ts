import { demandRegionSelectionKey } from "@/lib/demand/regions";
import {
  jobPublicDraftFromScope,
  type JobPublicRegionDraft,
} from "@/lib/jobs-public/job-region-scope";
import { isNationalPublicJobScope } from "@/lib/jobs-public/region-preference-shared";

export function jobPublicRegionKeysFromDraft(draft: JobPublicRegionDraft | null): string[] {
  if (!draft || draft.scope === "national") return [];
  if (draft.scope === "city") return [demandRegionSelectionKey({ scope: "city", cityId: draft.cityId })];
  return [
    demandRegionSelectionKey({
      scope: "district",
      cityId: draft.cityId,
      guSlug: draft.guSlug,
    }),
  ];
}

export function jobPublicRegionKeysFromPref(pref: {
  sido: string;
  sigungu: string | null;
}): string[] {
  if (isNationalPublicJobScope(pref)) return [];
  const draft = jobPublicDraftFromScope(pref);
  return jobPublicRegionKeysFromDraft(draft);
}

export function jobPublicRegionKeysFromJob(job: {
  region_sido: string | null;
  region_sigungu: string | null;
}): string[] {
  if (!job.region_sido) return [];
  return jobPublicRegionKeysFromPref({
    sido: job.region_sido,
    sigungu: job.region_sigungu,
  });
}
