import type { HomeSpotlightTender } from "@/lib/home/home-spotlight";

export type HomeRecentTenderSnapshot = {
  id: string;
  bid_ntce_nm: string | null;
  ntce_instt_nm: string | null;
  bid_clse_dt: string | null;
  bsns_dstr_nm: string | null;
  base_amt: number | null;
};

export type HomePostPreview = {
  id: string;
  title: string;
  published_at: string | null;
};

export function parseSpotlightJson(v: unknown): HomeSpotlightTender | null {
  if (v == null || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.title !== "string") return null;
  const amountWon =
    o.amountWon == null
      ? null
      : typeof o.amountWon === "number"
        ? o.amountWon
        : Number(o.amountWon);
  return {
    id: o.id,
    title: o.title,
    regionLabel: typeof o.regionLabel === "string" ? o.regionLabel : "—",
    ddayLabel: typeof o.ddayLabel === "string" ? o.ddayLabel : "—",
    amountWon: Number.isFinite(amountWon as number) ? (amountWon as number) : null,
  };
}

export function parseRecentTendersJson(v: unknown): HomeRecentTenderSnapshot[] {
  if (!Array.isArray(v)) return [];
  const out: HomeRecentTenderSnapshot[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    if (typeof t.id !== "string") continue;
    const base = t.base_amt;
    const baseNum =
      base == null ? null : typeof base === "number" ? base : Number(base);
    out.push({
      id: t.id,
      bid_ntce_nm: typeof t.bid_ntce_nm === "string" ? t.bid_ntce_nm : null,
      ntce_instt_nm: typeof t.ntce_instt_nm === "string" ? t.ntce_instt_nm : null,
      bid_clse_dt: typeof t.bid_clse_dt === "string" ? t.bid_clse_dt : null,
      bsns_dstr_nm: typeof t.bsns_dstr_nm === "string" ? t.bsns_dstr_nm : null,
      base_amt: baseNum != null && Number.isFinite(baseNum) ? baseNum : null,
    });
  }
  return out;
}

export function parsePostsPreviewJson(v: unknown): HomePostPreview[] {
  if (!Array.isArray(v)) return [];
  const out: HomePostPreview[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    if (typeof p.id !== "string" || typeof p.title !== "string") continue;
    out.push({
      id: p.id,
      title: p.title,
      published_at: typeof p.published_at === "string" ? p.published_at : null,
    });
  }
  return out;
}
