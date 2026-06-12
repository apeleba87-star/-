import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";
import { comparePayMonthlyNormalized } from "@/lib/jobs-public/compare-pay-monthly";

export type PublicJobSort = "pay" | "pay_asc" | "closing" | "latest";

export const PUBLIC_JOB_SORT_OPTIONS: { value: PublicJobSort; label: string }[] = [
  { value: "pay", label: "급여 높은순" },
  { value: "pay_asc", label: "급여 낮은순" },
  { value: "closing", label: "마감 임박" },
  { value: "latest", label: "최신" },
];

export function parsePublicJobSort(raw: unknown): PublicJobSort {
  if (raw === "closing" || raw === "latest" || raw === "pay" || raw === "pay_asc") return raw;
  return "pay";
}

function compareByPay(
  a: PublicJobOpeningListItem,
  b: PublicJobOpeningListItem,
  direction: "desc" | "asc"
): number {
  const pa = comparePayMonthlyNormalized(a);
  const pb = comparePayMonthlyNormalized(b);
  const aMissing = pa < 0;
  const bMissing = pb < 0;
  if (aMissing && bMissing) return (a.title ?? "").localeCompare(b.title ?? "", "ko");
  if (aMissing) return 1;
  if (bMissing) return -1;
  if (pb !== pa) return direction === "desc" ? pb - pa : pa - pb;
  return (a.title ?? "").localeCompare(b.title ?? "", "ko");
}

export function sortPublicJobList(
  jobs: PublicJobOpeningListItem[],
  sort: PublicJobSort
): PublicJobOpeningListItem[] {
  const copy = [...jobs];
  if (sort === "pay") {
    return copy.sort((a, b) => compareByPay(a, b, "desc"));
  }
  if (sort === "pay_asc") {
    return copy.sort((a, b) => compareByPay(a, b, "asc"));
  }
  if (sort === "closing") {
    const now = Date.now();
    const openOnly = copy.filter((j) => {
      if (!j.closing_at) return true;
      return new Date(j.closing_at).getTime() >= now;
    });
    return openOnly.sort((a, b) => {
      const ta = a.closing_at ? new Date(a.closing_at).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.closing_at ? new Date(b.closing_at).getTime() : Number.MAX_SAFE_INTEGER;
      if (ta !== tb) return ta - tb;
      return comparePayMonthlyNormalized(b) - comparePayMonthlyNormalized(a);
    });
  }
  if (sort === "latest") {
    return copy.sort((a, b) => {
      const ta = new Date(a.last_synced_at).getTime();
      const tb = new Date(b.last_synced_at).getTime();
      if (tb !== ta) return tb - ta;
      return comparePayMonthlyNormalized(b) - comparePayMonthlyNormalized(a);
    });
  }
  return copy.sort((a, b) => compareByPay(a, b, "desc"));
}

/** 마감일이 가장 가까운(미래) 공고 */
export function pickClosingSoonJob(
  jobs: PublicJobOpeningListItem[]
): PublicJobOpeningListItem | null {
  const now = Date.now();
  const upcoming = jobs
    .filter((j) => j.closing_at && new Date(j.closing_at).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.closing_at!).getTime() - new Date(b.closing_at!).getTime()
    );
  return upcoming[0] ?? null;
}
