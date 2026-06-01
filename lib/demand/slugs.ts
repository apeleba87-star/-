/** 서울 25구 slug ↔ 구명 (Phase 0 더미·UI용) */

export const SEOUL_GU_SLUG_TO_NAME: Record<string, string> = {
  "gangseo-gu": "강서구",
  "yangcheon-gu": "양천구",
  "mapo-gu": "마포구",
  "songpa-gu": "송파구",
  "yeongdeungpo-gu": "영등포구",
  "gwanak-gu": "관악구",
  "eunpyeong-gu": "은평구",
  "gangnam-gu": "강남구",
  "gangdong-gu": "강동구",
  "gangbuk-gu": "강북구",
  "gwangjin-gu": "광진구",
  "guro-gu": "구로구",
  "geumcheon-gu": "금천구",
  "nowon-gu": "노원구",
  "dobong-gu": "도봉구",
  "dongdaemun-gu": "동대문구",
  "dongjak-gu": "동작구",
  "seocho-gu": "서초구",
  "seodaemun-gu": "서대문구",
  "seongdong-gu": "성동구",
  "seongbuk-gu": "성북구",
  "yongsan-gu": "용산구",
  "jongno-gu": "종로구",
  "jung-gu": "중구",
  "jungnang-gu": "중랑구",
};

const NAME_TO_SLUG = Object.fromEntries(
  Object.entries(SEOUL_GU_SLUG_TO_NAME).map(([slug, gu]) => [gu, slug])
) as Record<string, string>;

export const SEOUL_GU_NAMES = Object.values(SEOUL_GU_SLUG_TO_NAME).sort((a, b) =>
  a.localeCompare(b, "ko")
);

export function guNameToSlug(gu: string): string | undefined {
  return NAME_TO_SLUG[gu];
}

export function guSlugToName(slug: string): string | undefined {
  return SEOUL_GU_SLUG_TO_NAME[slug];
}

export function isValidGuSlug(slug: string): boolean {
  return slug in SEOUL_GU_SLUG_TO_NAME;
}
