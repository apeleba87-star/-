/**
 * SEO 공통: 사이트 기준 URL, 사이트명. metadataBase·canonical·sitemap·OG·푸터용.
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

/** 기본 `<title>` / `og:title` — 공유 미리보기·검색 결과 1행 */
export const defaultTitle = "클린아이덱스 — 현장업, 기록으로 증명";

/** 기본 meta description / `og:description` (한글 약 155자 이내 권장) */
export const defaultDescription =
  "청소·방역 현장의 사진·체크리스트·고객 확인·전자서명을 한곳에 모읍니다. 나라장터 입찰·인력 구인·견적·시장 리포트는 데이터랩에서 함께 확인하세요.";

/** 푸터·보조 문구 등 짧은 한 줄 */
export const siteTagline = "현장 작업 증빙 · 입찰 · 구인 · 데이터랩을 한곳에서.";

/** layout `keywords` 등에 사용 */
export const seoKeywords = [
  "클린아이덱스",
  "Cleanidex",
  "청소업",
  "방역",
  "소독",
  "현장 증빙",
  "작업 완료",
  "전자서명",
  "체크리스트",
  "고객 확인",
  "입찰",
  "나라장터",
  "청소 입찰",
  "구인",
  "견적",
  "현장거래",
  "데이터랩",
  "마케팅 리포트",
];

export { SITE_NAME };
