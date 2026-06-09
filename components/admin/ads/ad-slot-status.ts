import type { SlotType } from "@/app/admin/ads/actions";
import { SLOT_TYPE_LABELS } from "@/lib/admin/ad-slot-placement";

const TODAY = new Date().toISOString().slice(0, 10);

type SlotLike = {
  enabled: boolean;
  slot_type: SlotType | null;
  script_content: string | null;
};

type CampaignLike = {
  start_date: string;
  end_date: string;
  title: string | null;
};

type CoupangCacheLike = {
  product_count: number;
  fetch_error: string | null;
} | null;

function campaignStatus(start: string, end: string): "live" | "waiting" | "ended" {
  if (TODAY < start) return "waiting";
  if (TODAY > end) return "ended";
  return "live";
}

export function summarizeAdSlotStatus(
  slot: SlotLike,
  campaigns: CampaignLike[],
  coupangCache?: CoupangCacheLike
): { tone: "live" | "off" | "idle" | "warn"; text: string } {
  if (!slot.enabled) {
    return { tone: "off", text: "노출 OFF" };
  }

  const type = slot.slot_type ?? "direct";
  const typeLabel = SLOT_TYPE_LABELS[type] ?? type;

  if (type === "direct") {
    const live = campaigns.filter((c) => campaignStatus(c.start_date, c.end_date) === "live");
    if (live.length > 0) {
      return { tone: "live", text: `${typeLabel} · 진행 ${live.length}건` };
    }
    const waiting = campaigns.filter((c) => campaignStatus(c.start_date, c.end_date) === "waiting");
    if (waiting.length > 0) {
      return { tone: "warn", text: `${typeLabel} · 대기 ${waiting.length}건 (활성 없음)` };
    }
    return { tone: "idle", text: `${typeLabel} · 캠페인 없음` };
  }

  if (type === "coupang_api") {
    const n = coupangCache?.product_count ?? 0;
    if (n > 0) return { tone: "live", text: `${typeLabel} · 상품 ${n}건` };
    if (coupangCache?.fetch_error) return { tone: "warn", text: `${typeLabel} · 조회 오류` };
    return { tone: "idle", text: `${typeLabel} · 상품 없음` };
  }

  if (slot.script_content?.trim()) {
    return { tone: "live", text: `${typeLabel} · 스크립트 설정됨` };
  }
  return { tone: "idle", text: `${typeLabel} · 스크립트 없음` };
}
