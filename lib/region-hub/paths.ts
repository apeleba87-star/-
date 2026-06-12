import { buildRadarShareParam } from "@/lib/demand/radar-share";
import type { DemandRegionSelection } from "@/lib/demand/regions";
import {
  jobPublicDraftFromScope,
  jobPublicScopeFromDemandSelection,
  type JobPublicRegionDraft,
} from "@/lib/jobs-public/job-region-scope";
import { buildPublicJobsSharePath } from "@/lib/jobs-public/share-metadata";
import { jobWageReportHref } from "@/lib/report/job-wage-hub-teaser";
import { demandSelectionFromJobPublicDraft } from "@/lib/region-hub/selection-bridge";

export { jobWageReportHref };

/** 입주레이더 허브 — 지역 맥락 유지 */
export function demandHubHrefFromSelection(sel: DemandRegionSelection): string {
  if (sel.scope === "national") return "/";
  const r = buildRadarShareParam(sel);
  return `/?r=${encodeURIComponent(r)}`;
}

export function demandHubHrefFromDraft(draft: JobPublicRegionDraft): string {
  const sel = demandSelectionFromJobPublicDraft(draft);
  return sel ? demandHubHrefFromSelection(sel) : "/";
}

export function jobsPublicHrefFromSelection(sel: DemandRegionSelection): string {
  const scope = jobPublicScopeFromDemandSelection(sel);
  const draft = jobPublicDraftFromScope(scope);
  return draft ? buildPublicJobsSharePath(draft) : "/jobs/public";
}

export function jobsPublicHrefFromDraft(draft: JobPublicRegionDraft): string {
  return buildPublicJobsSharePath(draft);
}
