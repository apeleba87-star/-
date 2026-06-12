import type { RadarAdSlot } from "@/lib/demand/radar-ads-shared";

/** KST 오늘 기준 슬롯별 노출 수 — 동률이면 무작위 */
export function pickFairRadarAdSlotId(
  slots: RadarAdSlot[],
  impressionCounts: Record<string, number>
): string | null {
  if (slots.length === 0) return null;

  let minCount = Infinity;
  for (const slot of slots) {
    const count = impressionCounts[slot.id] ?? 0;
    if (count < minCount) minCount = count;
  }

  const tied = slots.filter((slot) => (impressionCounts[slot.id] ?? 0) === minCount);
  const picked = tied[Math.floor(Math.random() * tied.length)];
  return picked?.id ?? slots[0]?.id ?? null;
}

export function radarAdSlotIndexById(slots: RadarAdSlot[], slotId: string): number {
  const idx = slots.findIndex((s) => s.id === slotId);
  return idx >= 0 ? idx : 0;
}

export function initRadarAdImpressionCounts(
  slots: RadarAdSlot[],
  dailyImpressions: Record<string, number> | undefined
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const slot of slots) {
    counts[slot.id] = dailyImpressions?.[slot.id] ?? 0;
  }
  return counts;
}

/** 화면에 노출된 슬롯 — 세션 내 로테이션 균형용 */
export function bumpRadarAdImpressionCount(
  counts: Record<string, number>,
  slotId: string
): Record<string, number> {
  return { ...counts, [slotId]: (counts[slotId] ?? 0) + 1 };
}
