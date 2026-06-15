/** radar_ad_events — 마감앱 vs 클린아이덱스 웹 구분 */

export type RadarAdEventChannel = "magam" | "web";

type EventLike = {
  page_path?: string | null;
  meta?: Record<string, unknown> | null;
};

export function isMagamRadarAdEvent(row: EventLike): boolean {
  const surface = row.meta?.surface;
  if (surface === "magam_app") return true;
  const path = row.page_path?.trim();
  return Boolean(path?.startsWith("magam:"));
}

export function radarAdEventChannel(row: EventLike): RadarAdEventChannel {
  return isMagamRadarAdEvent(row) ? "magam" : "web";
}
