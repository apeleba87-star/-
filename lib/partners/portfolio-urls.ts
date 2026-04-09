import { PARTNER_PORTFOLIO_BUCKET } from "./portfolio-constants";

export function partnerPortfolioPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  if (!base) return "";
  const enc = storagePath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base}/storage/v1/object/public/${PARTNER_PORTFOLIO_BUCKET}/${enc}`;
}
