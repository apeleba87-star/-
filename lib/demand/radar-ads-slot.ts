/** 입주레이더 광고 슬롯 상태 — 클라이언트·서버 공용 */

import { getDemandCity, getDemandDistrictRef, labelFromDemandRegionKey, parseDemandRegionKey } from "@/lib/demand/regions";
import { addDaysToDateString } from "@/lib/jobs/kst-date";

export const RADAR_AD_SLOTS_PER_BANNER = 5;

export function radarAdSlotIndices(): number[] {
  return Array.from({ length: RADAR_AD_SLOTS_PER_BANNER }, (_, i) => i + 1);
}

export function createRadarAdSlotRecord<T>(factory: (slotIndex: number) => T): Record<number, T> {
  const record: Record<number, T> = {};
  for (const slotIndex of radarAdSlotIndices()) {
    record[slotIndex] = factory(slotIndex);
  }
  return record;
}
export const RADAR_AD_EXPIRING_SOON_DAYS = 14;

export type RadarAdSlotLike = {
  slot_index?: number;
  status: string;
  start_date: string;
  end_date: string;
  title?: string;
  advertiser_name?: string | null;
};

export function isRadarSlotLive(slot: RadarAdSlotLike, today: string): boolean {
  return slot.status === "active" && slot.start_date <= today && slot.end_date >= today;
}

export function countLiveRadarSlots(slots: RadarAdSlotLike[], today: string): number {
  return slots.filter((s) => isRadarSlotLive(s, today)).length;
}

export function countOpenRadarSlots(slots: RadarAdSlotLike[], today: string): number {
  return Math.max(0, RADAR_AD_SLOTS_PER_BANNER - countLiveRadarSlots(slots, today));
}

export function isRadarSlotExpiringSoon(
  slot: RadarAdSlotLike,
  today: string,
  withinDays = RADAR_AD_EXPIRING_SOON_DAYS
): boolean {
  if (slot.status !== "active") return false;
  if (slot.end_date < today) return false;
  const deadline = addDaysToDateString(today, withinDays);
  return slot.end_date <= deadline;
}

export function radarSlotDaysLeft(endDate: string, today: string): number {
  const start = new Date(`${today}T12:00:00+09:00`).getTime();
  const end = new Date(`${endDate}T12:00:00+09:00`).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

/** 목록·대시보드용 짧은 지역명 — 예: 서울 강서구 */
export function formatRadarAdRegionShortLabel(regionKey: string): string {
  const sel = parseDemandRegionKey(regionKey);
  if (!sel) return regionKey;
  if (sel.scope === "city") {
    const city = getDemandCity(sel.cityId);
    return city ? `${city.label} 전체` : labelFromDemandRegionKey(regionKey);
  }
  if (sel.scope === "district") {
    const city = getDemandCity(sel.cityId);
    const district = getDemandDistrictRef(sel.cityId, sel.guSlug);
    if (city && district) return `${city.label} ${district.gu}`;
  }
  return labelFromDemandRegionKey(regionKey);
}

export function formatRegionWithLiveCount(label: string, liveCount: number): string {
  return liveCount > 0 ? `${label} (${liveCount})` : label;
}
