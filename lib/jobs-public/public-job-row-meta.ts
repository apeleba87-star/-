import { formatClosingPrimary } from "@/lib/jobs-public/format-closing";
import {
  formatJobPayForMode,
  type PublicJobPayDisplayMode,
} from "@/lib/jobs-public/pay-display-mode";
import { parseWorkRegion } from "@/lib/jobs-public-ingest/worknet/region-parse";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";

export type PublicJobRowMeta = {
  pay: string;
  region: string;
  preset: string;
  closing: string;
  company: string | null;
  title: string;
  externalUrl: string | null;
  detailHref: string;
};

export function publicJobRowMeta(
  job: PublicJobOpeningListItem,
  opts?: { payMode?: PublicJobPayDisplayMode }
): PublicJobRowMeta {
  const region = parseWorkRegion(job.region_text ?? "", {
    title: job.title,
    company: job.company,
  }).regionLabel;
  const payMode = opts?.payMode ?? "monthly";
  return {
    pay: formatJobPayForMode(job, payMode),
    region,
    preset: job.preset_label ?? "청소·용역",
    closing: formatClosingPrimary(job.closing_at),
    company: job.company,
    title: job.title,
    externalUrl: job.external_url?.trim() || null,
    detailHref: `/jobs/public/${encodeURIComponent(job.id)}`,
  };
}

export function countClosingWithinDays(
  jobs: PublicJobOpeningListItem[],
  days: number,
  now = Date.now()
): number {
  const limit = now + days * 24 * 60 * 60 * 1000;
  return jobs.filter((j) => {
    if (!j.closing_at) return false;
    const t = new Date(j.closing_at).getTime();
    return t >= now && t <= limit;
  }).length;
}
