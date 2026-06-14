import { getBaseUrl } from "@/lib/seo";

/** 카톡 공유용 공개 URL (웹) */
export function buildMagamShareUrl(shareSlug: string): string {
  const base = (process.env.MAGAM_SHARE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? getBaseUrl()).replace(
    /\/$/,
    ""
  );
  return `${base}/p/${shareSlug}`;
}
