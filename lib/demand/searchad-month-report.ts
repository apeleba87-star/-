import { getKstTodayString } from "@/lib/jobs/kst-date";

/**
 * KST 기준 콘솔 「월별」 검색량에서 마지막으로 확정된 달.
 * 예: 2026-06-04 → 2026-05 (6월 달력 검색량은 아직 없음)
 */
export function demandLastCompleteSearchVolumeYyyymm(): string {
  const today = getKstTodayString();
  const [y, m] = today.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 아직 달력 월 검색량이 나오지 않은 yyyymm (차트·스냅샷 제외용) */
export function demandIsIncompleteSearchVolumeMonth(yyyymm: string): boolean {
  return yyyymm > demandLastCompleteSearchVolumeYyyymm();
}

/** API 롤링 30일 스냅샷을 붙일 yyyymm — 직전 확정 달 */
export function demandSearchAdSnapshotYyyymm(): string {
  return demandLastCompleteSearchVolumeYyyymm();
}
