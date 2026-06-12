import { demandRegionSelectionKey, type DemandRegionSelection } from "@/lib/demand/regions";
import type { JobPublicRegionDraft } from "@/lib/jobs-public/job-region-scope";
import { demandSelectionFromJobPublicDraft } from "@/lib/region-hub/selection-bridge";

export type JobsPublicHubScopeTeaser = {
  jobCount: number;
  topPayDisplay: string | null;
};

export type JobsPublicHubTeaser = {
  nationalCount: number;
  nationalTopPay: string | null;
  bySelectionKey: Record<string, JobsPublicHubScopeTeaser>;
};

export function jobsPublicTeaserForSelection(
  teaser: JobsPublicHubTeaser,
  sel: DemandRegionSelection
): JobsPublicHubScopeTeaser {
  return teaser.bySelectionKey[demandRegionSelectionKey(sel)] ?? { jobCount: 0, topPayDisplay: null };
}

export function jobsPublicTeaserForDraft(
  teaser: JobsPublicHubTeaser,
  draft: JobPublicRegionDraft
): JobsPublicHubScopeTeaser {
  const sel = demandSelectionFromJobPublicDraft(draft);
  if (!sel) return { jobCount: teaser.nationalCount, topPayDisplay: teaser.nationalTopPay };
  return jobsPublicTeaserForSelection(teaser, sel);
}
