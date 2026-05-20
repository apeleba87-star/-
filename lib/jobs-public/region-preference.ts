import { cookies } from "next/headers";
import {
  DEFAULT_PUBLIC_JOB_REGION,
  spotlightScopeKey,
} from "@/lib/jobs-public-ingest/worknet/region-parse";

export const JOB_PUBLIC_REGION_COOKIE = "job_public_region";

export type JobPublicRegionPreference = {
  sido: string;
  sigungu: string | null;
  label: string;
  scopeKey: string;
};

export function parseRegionCookie(raw: string | undefined): JobPublicRegionPreference {
  if (!raw?.trim()) return preferenceFromScope(DEFAULT_PUBLIC_JOB_REGION);
  try {
    const j = JSON.parse(raw) as { sido?: string; sigungu?: string | null };
    const sido = (j.sido ?? DEFAULT_PUBLIC_JOB_REGION.sido).trim();
    const sigungu = j.sigungu?.trim() || null;
    return preferenceFromScope({ sido, sigungu });
  } catch {
    return preferenceFromScope(DEFAULT_PUBLIC_JOB_REGION);
  }
}

export function preferenceFromScope(scope: {
  sido: string;
  sigungu?: string | null;
}): JobPublicRegionPreference {
  const sigungu = scope.sigungu?.trim() || null;
  const label = sigungu ? `${scope.sido} ${sigungu}` : `${scope.sido} 전체`;
  return {
    sido: scope.sido,
    sigungu,
    label,
    scopeKey: spotlightScopeKey({ sido: scope.sido, sigungu }),
  };
}

export async function getJobPublicRegionPreference(): Promise<JobPublicRegionPreference> {
  const jar = await cookies();
  return parseRegionCookie(jar.get(JOB_PUBLIC_REGION_COOKIE)?.value);
}

export function serializeRegionPreference(pref: JobPublicRegionPreference): string {
  return JSON.stringify({ sido: pref.sido, sigungu: pref.sigungu });
}
