/**
 * SEO 공통: 사이트 기준 URL, 사이트명. metadataBase·canonical·sitemap용.
 */
const SITE_NAME = "클린아이덱스";

/** 프로덕션 도메인 또는 Vercel URL. 설정 없으면 상대 경로만 사용 */
export function getBaseUrl(): string {
  if (typeof process.env.NEXT_PUBLIC_SITE_URL === "string" && process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (typeof process.env.VERCEL_URL === "string" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://cleanindex.kr";
}

export const defaultTitle = "청소업 정보 뉴스레터 - 클린아이덱스";
export const defaultDescription =
  "청소업 정보 뉴스레터 클린아이덱스 — 입찰·구인·현장 데이터와 커뮤니티. 청소·방역 입찰 공고, 견적 계산기, 현장 거래 정보를 한곳에서.";

export { SITE_NAME };
