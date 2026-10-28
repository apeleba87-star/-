import "server-only";
import type { NextRequest } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { getProductSalesMap, STATIC_PRODUCT_SALES_FALLBACK } from "@/lib/knowledge-hub/product-sales";

export async function resolveProductSalesDestination(productId: string): Promise<string | null> {
  try {
    const supabase = createServiceSupabase();
    const { data } = await supabase
      .from("cleaning_product_sales")
      .select("sales_url")
      .eq("product_id", productId)
      .maybeSingle<{ sales_url: string }>();
    if (data?.sales_url && /^https?:\/\//i.test(data.sales_url)) return data.sales_url;
  } catch {
    // fallback below
  }

  try {
    const map = await getProductSalesMap();
    const row = map[productId];
    if (row?.sales_url && /^https?:\/\//i.test(row.sales_url)) return row.sales_url;
  } catch {
    // ignore
  }

  const fallback = STATIC_PRODUCT_SALES_FALLBACK[productId];
  if (fallback?.url && /^https?:\/\//i.test(fallback.url)) return fallback.url;

  return null;
}

export async function logProductSalesClick(input: {
  productId: string;
  destinationUrl: string | null;
  source?: string | null;
  req: NextRequest;
}): Promise<void> {
  try {
    const supabase = createServiceSupabase();
    const ua = input.req.headers.get("user-agent")?.slice(0, 512) ?? null;
    const referrer = input.req.headers.get("referer")?.slice(0, 1024) ?? null;
    const pagePath = referrer ? safePathFromReferrer(referrer) : null;
    const sessionId = input.req.cookies.get("ad_session_id")?.value?.slice(0, 256) ?? null;
    const visitorId = input.req.cookies.get("ad_visitor_id")?.value?.slice(0, 256) ?? null;

    await supabase.from("product_sales_clicks").insert({
      product_id: input.productId.slice(0, 128),
      destination_url: input.destinationUrl?.slice(0, 2048) ?? null,
      source: input.source?.slice(0, 64) ?? null,
      page_path: pagePath,
      referrer,
      session_id: sessionId,
      anon_visitor_id: visitorId,
      user_agent: ua,
    });
  } catch (e) {
    console.error("[product_sales_clicks] insert failed", e);
  }
}

function safePathFromReferrer(referrer: string): string | null {
  try {
    const u = new URL(referrer);
    return `${u.pathname}${u.search}`.slice(0, 1024);
  } catch {
    return null;
  }
}

export type ProductClickAgg = {
  product_id: string;
  clicks: number;
  unique_sessions: number;
  last_clicked_at: string | null;
};

export type DailyClickAgg = {
  day: string;
  clicks: number;
};

/** 기간별 제품 클릭 집계 */
export async function loadProductSalesClickStats(opts: {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD inclusive
}): Promise<{ byProduct: ProductClickAgg[]; byDay: DailyClickAgg[]; total: number }> {
  const supabase = createServiceSupabase();
  const fromIso = `${opts.from}T00:00:00+09:00`;
  // inclusive end-of-day KST
  const toDate = new Date(`${opts.to}T00:00:00+09:00`);
  toDate.setDate(toDate.getDate() + 1);
  const toIso = toDate.toISOString();

  const { data, error } = await supabase
    .from("product_sales_clicks")
    .select("product_id, session_id, created_at")
    .gte("created_at", fromIso)
    .lt("created_at", toIso)
    .order("created_at", { ascending: false })
    .limit(20000);

  if (error || !data) {
    console.error("[product_sales_clicks] load failed", error?.message);
    return { byProduct: [], byDay: [], total: 0 };
  }

  const byProductMap = new Map<
    string,
    { clicks: number; sessions: Set<string>; last: string | null }
  >();
  const byDayMap = new Map<string, number>();

  for (const row of data as { product_id: string; session_id: string | null; created_at: string }[]) {
    const cur = byProductMap.get(row.product_id) ?? {
      clicks: 0,
      sessions: new Set<string>(),
      last: null,
    };
    cur.clicks += 1;
    if (row.session_id) cur.sessions.add(row.session_id);
    if (!cur.last || row.created_at > cur.last) cur.last = row.created_at;
    byProductMap.set(row.product_id, cur);

    const day = toKstDate(row.created_at);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
  }

  const byProduct: ProductClickAgg[] = [...byProductMap.entries()]
    .map(([product_id, v]) => ({
      product_id,
      clicks: v.clicks,
      unique_sessions: v.sessions.size,
      last_clicked_at: v.last,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  const byDay: DailyClickAgg[] = [...byDayMap.entries()]
    .map(([day, clicks]) => ({ day, clicks }))
    .sort((a, b) => (a.day < b.day ? 1 : -1));

  return { byProduct, byDay, total: data.length };
}

function toKstDate(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}
