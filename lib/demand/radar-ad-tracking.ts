/**
 * 입주레이더 광고 성과 수집 — 노출(50%·0.4초)·클릭
 * 동일 세션·슬롯 노출은 30분 쿨다운(새로고침 남용 방지)
 */

const EVENT_API = "/api/demand/radar-ads/event";
const SESSION_KEY = "ad_session_id";
const VISITOR_KEY = "ad_visitor_id";
const COOLDOWN_PREFIX = "radar_ad_imp_at_";

/** 배너 25% 이상 보인 뒤 이 시간(ms) 유지 시 노출 1회 */
export const RADAR_AD_VIEWABLE_MS = 400;

/** 화면에 보이는 면적 비율 기준 (배너 요소) */
export const RADAR_AD_VIEWABLE_RATIO = 0.25;

/** 같은 세션·슬롯 노출 재전송 쿨다운 */
export const RADAR_AD_IMPRESSION_COOLDOWN_MS = 30 * 60 * 1000;

export type RadarAdEventType = "impression" | "click" | "phone_click";

export type RadarAdTrackPayload = {
  event_type: RadarAdEventType;
  slot_id: string;
  session_id?: string | null;
  anon_visitor_id?: string | null;
  page_path?: string | null;
  referrer?: string | null;
  meta?: Record<string, unknown> | null;
};

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

export function canSendRadarAdImpression(slotId: string, now = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  const raw = sessionStorage.getItem(`${COOLDOWN_PREFIX}${slotId}`);
  if (!raw) return true;
  const last = Number(raw);
  if (!Number.isFinite(last)) return true;
  return now - last >= RADAR_AD_IMPRESSION_COOLDOWN_MS;
}

export function markRadarAdImpressionSent(slotId: string, now = Date.now()): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${COOLDOWN_PREFIX}${slotId}`, String(now));
}

export async function trackRadarAdEvent(payload: RadarAdTrackPayload): Promise<boolean> {
  const body = {
    ...payload,
    session_id: payload.session_id ?? getSessionId(),
    anon_visitor_id: payload.anon_visitor_id ?? getVisitorId(),
    referrer: payload.referrer ?? (typeof document !== "undefined" ? document.referrer || null : null),
  };
  try {
    const res = await fetch(EVENT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    if (!res.ok && process.env.NODE_ENV === "development") {
      const text = await res.text().catch(() => "");
      console.warn("[radar-ad-tracking]", res.status, text);
    }
    return res.ok;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[radar-ad-tracking] fetch failed", err);
    }
    return false;
  }
}
