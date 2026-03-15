/**
 * 직접 수주 광고 성과 수집: 노출/클릭 이벤트 전송
 * 1단계: impression, click
 */

const EVENT_API = "/api/ads/event";

const SESSION_KEY = "ad_session_id";
const VISITOR_KEY = "ad_visitor_id";

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

export type AdEventPayload = {
  event_type: "impression" | "viewable_impression" | "click" | "phone_click" | "website_click" | "inquiry_submit" | "quote_request_submit" | "kakao_click";
  campaign_id?: string | null;
  slot_key: string;
  session_id?: string | null;
  anon_visitor_id?: string | null;
  page_path?: string | null;
  referrer?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function trackAdEvent(payload: AdEventPayload): Promise<void> {
  const body = {
    ...payload,
    session_id: payload.session_id ?? getSessionId(),
    anon_visitor_id: payload.anon_visitor_id ?? getVisitorId(),
    referrer: payload.referrer ?? (typeof document !== "undefined" ? document.referrer || null : null),
  };
  try {
    await fetch(EVENT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // fire-and-forget
  }
}
