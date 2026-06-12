import {
  isNationalPublicJobScope,
  NATIONAL_PUBLIC_JOB_SIDO,
  spotlightScopeKey,
} from "@/lib/jobs-public-ingest/worknet/region-parse";
import {
  jobPublicScopeFromDraft,
  parseJobPublicRegionCookie,
} from "@/lib/jobs-public/job-region-scope";

export { NATIONAL_PUBLIC_JOB_SIDO, isNationalPublicJobScope };

export const JOB_PUBLIC_REGION_COOKIE = "job_public_region";

export type JobPublicRegionPreference = {
  sido: string;
  sigungu: string | null;
  label: string;
  scopeKey: string;
};

export function preferenceFromScope(scope: {
  sido: string;
  sigungu?: string | null;
}): JobPublicRegionPreference {
  if (isNationalPublicJobScope(scope)) {
    return {
      sido: NATIONAL_PUBLIC_JOB_SIDO,
      sigungu: null,
      label: NATIONAL_PUBLIC_JOB_SIDO,
      scopeKey: spotlightScopeKey({ sido: NATIONAL_PUBLIC_JOB_SIDO }),
    };
  }
  const sigungu = scope.sigungu?.trim() || null;
  const label = sigungu ? `${scope.sido} ${sigungu}` : `${scope.sido} 전체`;
  return {
    sido: scope.sido,
    sigungu,
    label,
    scopeKey: spotlightScopeKey({ sido: scope.sido, sigungu }),
  };
}

export function parseRegionCookie(raw: string | undefined): JobPublicRegionPreference {
  const draft = parseJobPublicRegionCookie(raw);
  return preferenceFromScope(jobPublicScopeFromDraft(draft));
}

export function serializeRegionPreference(pref: JobPublicRegionPreference): string {
  return JSON.stringify({ sido: pref.sido, sigungu: pref.sigungu });
}
