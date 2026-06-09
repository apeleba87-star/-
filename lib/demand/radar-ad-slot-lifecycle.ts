import type { RadarAdSlotStatus } from "@/lib/demand/radar-ads-shared";
import type { RadarAdSlotLike } from "@/lib/demand/radar-ads-slot";
import { isRadarSlotLive } from "@/lib/demand/radar-ads-slot";

/** 관리 화면용 노출 단계 (DB status + 기간 조합) */
export type RadarSlotLifecyclePhase =
  | "live"
  | "scheduled"
  | "paused"
  | "draft"
  | "ended"
  | "ended_active";

export function getRadarSlotLifecyclePhase(
  slot: RadarAdSlotLike & { status: string },
  today: string
): RadarSlotLifecyclePhase {
  if (slot.status === "draft") return "draft";
  if (slot.status === "paused") {
    return slot.end_date < today ? "ended" : "paused";
  }
  if (slot.status === "active") {
    if (slot.end_date < today) return "ended_active";
    if (slot.start_date > today) return "scheduled";
    if (isRadarSlotLive(slot, today)) return "live";
    return "scheduled";
  }
  return "draft";
}

export const RADAR_SLOT_LIFECYCLE_LABELS: Record<RadarSlotLifecyclePhase, string> = {
  live: "게재 중",
  scheduled: "게재 예약",
  paused: "중지",
  draft: "초안",
  ended: "종료·보관",
  ended_active: "기간 만료 (정리 필요)",
};

export const RADAR_SLOT_LIFECYCLE_HINTS: Record<RadarSlotLifecyclePhase, string> = {
  live: "현재 화면에 노출됩니다.",
  scheduled: "시작일 이후 자동 게재됩니다.",
  paused: "중간 중지·해지. 삭제하지 말고 보관하세요.",
  draft: "미노출·보관. 재계약 시 기간·상태만 수정하세요.",
  ended: "계약 종료. 성과 기록 유지를 위해 삭제하지 마세요.",
  ended_active: "종료일이 지났는데 게재 상태입니다. 「종료 보관」을 누르세요.",
};

export const RADAR_SLOT_LIFECYCLE_CLASS: Record<RadarSlotLifecyclePhase, string> = {
  live: "bg-emerald-100 text-emerald-800",
  scheduled: "bg-sky-100 text-sky-800",
  paused: "bg-amber-100 text-amber-800",
  draft: "bg-slate-100 text-slate-600",
  ended: "bg-slate-200 text-slate-700",
  ended_active: "bg-orange-100 text-orange-900",
};

/** 저장 시 active인데 기간이 지난 슬롯은 자동 중지 */
export function normalizeRadarAdSlotStatusForSave(
  status: RadarAdSlotStatus,
  startDate: string,
  endDate: string,
  today: string
): RadarAdSlotStatus {
  if (status === "active" && endDate < today) {
    return "paused";
  }
  if (startDate > endDate) {
    return status;
  }
  return status;
}

export function isStaleActiveRadarSlot(
  slot: RadarAdSlotLike & { status: string },
  today: string
): boolean {
  return slot.status === "active" && slot.end_date < today;
}
