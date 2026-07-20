import { getPlaceLabel, PRIMARY_PLACE_ORDER } from "@/lib/knowledge-hub/solutions/taxonomy";
import type { PlaceJob } from "@/lib/knowledge-hub/place-jobs/types";

/** Client-safe — do not import store / supabase here */

export type PlaceJobCard = {
  id: string;
  placeId: string;
  placeLabel: string;
  slug: string;
  title: string;
  summary?: string;
  path: string;
};

export function getPlaceJobPath(job: Pick<PlaceJob, "placeId" | "slug">): string {
  return `/places/${job.placeId}/${job.slug}`;
}

export function toPlaceJobCard(job: PlaceJob): PlaceJobCard {
  return {
    id: job.id,
    placeId: job.placeId,
    placeLabel: getPlaceLabel(job.placeId),
    slug: job.slug,
    title: job.title,
    summary: job.summary,
    path: getPlaceJobPath(job),
  };
}

/** 허브에 노출할 장소 (시드/DB에 job이 있는 것만 + PRIMARY 순서) */
export function placeIdsWithJobs(jobs: { placeId: string }[]): string[] {
  const have = new Set(jobs.map((j) => j.placeId));
  const ordered = PRIMARY_PLACE_ORDER.filter((id) => have.has(id));
  for (const id of have) {
    if (!ordered.includes(id as (typeof PRIMARY_PLACE_ORDER)[number])) ordered.push(id);
  }
  return ordered;
}

export function summaryWithPlaceJob(summary: string, placeLabel: string): string {
  const body = summary.trim();
  if (!body) return body;
  if (body.startsWith(placeLabel)) return body;
  return `${placeLabel} ${body}`;
}
