/**
 * 입주레이더 지역 조회 클라이언트 계측 — 로그인·비로그인 공통
 * 동일 세션·region_key는 10분 쿨다운(새로고침·포커스 반복 완화)
 */

import type { DemandRegionViewSource } from "@/lib/demand/region-view-events";

const EVENT_API = "/api/demand/region-views/event";
const SESSION_KEY = "demand_rv_session_id";
const VISITOR_KEY = "demand_rv_visitor_id";
const COOLDOWN_PREFIX = "demand_rv_at_";

export const DEMAND_REGION_VIEW_COOLDOWN_MS = 10 * 60 * 1000;

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) {
    s = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let v = localStorage.getItem(VISITOR_KEY);
  if (!v) {
    v = crypto.randomUUID?.() ?? `v-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(VISITOR_KEY, v);
  }
  return v;
}

export function canTrackDemandRegionView(regionKey: string, now = Date.now()): boolean {
  if (typeof window === "undefined" || !regionKey || regionKey === "national") return false;
  const raw = sessionStorage.getItem(`${COOLDOWN_PREFIX}${regionKey}`);
  if (!raw) return true;
  const last = Number(raw);
  if (!Number.isFinite(last)) return true;
  return now - last >= DEMAND_REGION_VIEW_COOLDOWN_MS;
}

export function markDemandRegionViewTracked(regionKey: string, now = Date.now()): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${COOLDOWN_PREFIX}${regionKey}`, String(now));
}

export async function trackDemandRegionView(
  regionKey: string,
  source: DemandRegionViewSource
): Promise<void> {
  if (!canTrackDemandRegionView(regionKey)) return;

  try {
    const res = await fetch(EVENT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region_key: regionKey,
        source,
        session_id: getSessionId(),
        anon_visitor_id: getVisitorId(),
        page_path: typeof window !== "undefined" ? window.location.pathname : null,
      }),
      keepalive: true,
    });
    if (res.ok) {
      markDemandRegionViewTracked(regionKey);
    }
  } catch {
    // ignore
  }
}
