import { partnerPortfolioPublicUrl } from "./portfolio-urls";

export type PortfolioRowLike = {
  image_path_thumb: string | null;
  image_path_display: string | null;
  external_image_url: string | null;
};

export function resolvePortfolioItemUrls(row: PortfolioRowLike): { thumbUrl: string; displayUrl: string } {
  const ext = row.external_image_url?.trim();
  if (ext) {
    return { thumbUrl: ext, displayUrl: ext };
  }
  const t = row.image_path_thumb?.trim() ?? "";
  const d = row.image_path_display?.trim() ?? "";
  if (!t || !d) {
    return { thumbUrl: "", displayUrl: "" };
  }
  return {
    thumbUrl: partnerPortfolioPublicUrl(t),
    displayUrl: partnerPortfolioPublicUrl(d),
  };
}

export function portfolioItemUsesExternalUrl(row: PortfolioRowLike): boolean {
  return Boolean(row.external_image_url?.trim());
}
