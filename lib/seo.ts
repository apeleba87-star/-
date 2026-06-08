import type { Metadata } from "next";
import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";

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

/** layout fallback — 브랜드·플랫폼 중립 */
export const defaultTitle = "클린아이덱스 — 청소·방역 업체를 위한 데이터·현장 도구";

/** layout·JSON-LD 기본 설명 (한글 약 155자 이내 권장) */
export const defaultDescription =
  "입주·이사 수요(입주레이더), 현장 작업 증빙, 나라장터 입찰·낙찰, 인력·시장 리포트를 한 플랫폼에서.";

/** 푸터·보조 문구 */
export const siteTagline = "입주레이더 · 나라장터 · 리포트 · 견적";

/** `/` — 입주레이더 */
export const radarHomeTitle = "입주레이더 — 이번 달 입주·이사 수요가 많은 지역";
export const radarHomeDescription =
  "국토부 아파트 거래와 이사·입주청소 검색 신호로 지역별 입주 수요를 비교합니다. 청소·이사 업체 영업 우선순위 참고용.";

/** `/cleanidex/about` — 현장 증빙 SaaS */
export const cleanidexAboutTitle = "현장 작업 증빙 — 청소·방역, 기록으로 증명";
export const cleanidexAboutDescription =
  "작업 전후 사진, 체크리스트, 고객 확인·전자서명을 한곳에 모읍니다. 분쟁 대비와 작업 완료 보고서까지.";

/** `/tenders` */
export const tenderListTitle = "청소·방역 입찰 공고";
export const tenderListDescription =
  "나라장터 청소·방역·소독 입찰 공고를 업종·지역별로 모아봅니다. 마감 임박·예산순 정렬을 지원합니다.";

/** `/tender-awards` */
export const tenderAwardListTitle = "청소·방역 낙찰 결과";
export const tenderAwardListDescription =
  "나라장터 청소·방역 관련 낙찰 결과와 낙찰률·경쟁 현황을 확인합니다. 입찰 전략 참고용.";

export function radarRegionTitle(regionLabel: string): string {
  return `${regionLabel} 입주·이사 수요`;
}

export function radarRegionDescription(regionLabel: string, cityLabel?: string): string {
  const place = cityLabel ? `${cityLabel} ${regionLabel}` : regionLabel;
  return `${place} 아파트 거래와 입주청소·이사 검색 신호로 이번 달 입주 수요를 확인합니다. 청소·이사 영업 참고 | 입주레이더`;
}

/** SEO 랜딩 — 「○○ 입주청소 수요」 */
export function radarRegionSeoTitle(placeLabel: string, targetYyyymm: string | null): string {
  if (targetYyyymm) {
    const [y, m] = targetYyyymm.split("-");
    return `${placeLabel} 입주청소 수요 — ${Number(y)}년 ${Number(m)}월 · 입주레이더`;
  }
  return `${placeLabel} 입주청소 수요 · 입주레이더`;
}

export function radarRegionSeoDescription(opts: {
  placeLabel: string;
  targetYyyymm: string | null;
  jeonseCount: number;
  jeonseMom: number;
  saleCount: number;
  moveInIndexMom: number;
  score: number;
  bandLabel: string;
}): string {
  const month =
    opts.targetYyyymm != null
      ? `${opts.targetYyyymm.split("-")[0]}년 ${Number(opts.targetYyyymm.split("-")[1])}월`
      : "이번 달";
  const jMom = opts.jeonseMom > 0 ? `+${opts.jeonseMom}` : String(opts.jeonseMom);
  const mIdx =
    opts.moveInIndexMom > 0 ? `+${opts.moveInIndexMom.toFixed(1)}` : opts.moveInIndexMom.toFixed(1);
  return `${opts.placeLabel} ${month} 입주 수요. 전월세 ${opts.jeonseCount}건(전월 ${jMom}%), 매매 ${opts.saleCount}건, 입주청소 검색 ${mIdx}%, 입주 예상 점수 ${Math.round(opts.score)}(${opts.bandLabel}). 청소·이사 업체 영업 참고 | 국토부 RTMS·검색 데이터`;
}

export function resolveDemandRegionForSeo(guSlug: string): { gu: string; cityLabel: string } | null {
  for (const city of DEMAND_REGION_REGISTRY) {
    const district = city.districts.find((d) => d.slug === guSlug);
    if (district) {
      return { gu: district.gu, cityLabel: city.label };
    }
  }
  return null;
}

/** 페이지별 title·description·canonical·OG·Twitter */
export function buildPageMetadata(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const canonical = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
  const url = `${getBaseUrl()}${canonical}`;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
    },
  };
}

/** layout `keywords` — 페이지별 의도는 title·description·본문에서 구분 */
export const seoKeywords = [
  "클린아이덱스",
  "Cleanidex",
  "입주레이더",
  "입주청소",
  "입주청소 지역",
  "입주 수요",
  "이사 청소",
  "아파트 입주",
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
  "방역 입찰",
  "구인",
  "견적",
  "현장거래",
  "데이터랩",
  "마케팅 리포트",
];

export { SITE_NAME };
