import { SOURCE_PLACE_JOBS } from "@/lib/knowledge-hub/place-jobs/seed";
import {
  getArchivedPlaceJobIds,
  getDbPlaceJobsPublished,
} from "@/lib/knowledge-hub/place-jobs/store";
import type { PlaceJob } from "@/lib/knowledge-hub/place-jobs/types";
import {
  getPlaceJobPath,
  placeIdsWithJobs,
  summaryWithPlaceJob,
  toPlaceJobCard,
  type PlaceJobCard,
} from "@/lib/knowledge-hub/place-jobs/shared";

export type { PlaceJobCard };
export { getPlaceJobPath, placeIdsWithJobs, summaryWithPlaceJob, toPlaceJobCard };

export function listSeedPlaceJobs(opts?: { publishedOnly?: boolean }): PlaceJob[] {
  const rows = SOURCE_PLACE_JOBS;
  if (opts?.publishedOnly === false) return rows;
  return rows.filter((j) => j.status === "published");
}

/** Seed + DB published; archived IDs suppress seed */
export async function listMergedPlaceJobs(): Promise<PlaceJob[]> {
  const seed = listSeedPlaceJobs();
  const [dbJobs, archived] = await Promise.all([
    getDbPlaceJobsPublished(),
    getArchivedPlaceJobIds(),
  ]);
  const archivedIds = new Set(archived);
  const map = new Map<string, PlaceJob>();
  for (const j of seed) {
    if (archivedIds.has(j.id)) continue;
    map.set(j.id, j);
  }
  for (const j of dbJobs) {
    if (archivedIds.has(j.id)) continue;
    map.set(j.id, j);
  }
  return [...map.values()].sort((a, b) => {
    if (a.placeId !== b.placeId) return a.placeId.localeCompare(b.placeId);
    return a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ko");
  });
}

export async function getMergedPlaceJob(
  placeId: string,
  slug: string
): Promise<PlaceJob | undefined> {
  const all = await listMergedPlaceJobs();
  return all.find((j) => j.placeId === placeId && j.slug === slug);
}

export function listPlaceJobCardsFromSeed(): PlaceJobCard[] {
  return listSeedPlaceJobs().map(toPlaceJobCard);
}

export async function listPlaceJobCards(): Promise<PlaceJobCard[]> {
  const jobs = await listMergedPlaceJobs();
  return jobs.map(toPlaceJobCard);
}
