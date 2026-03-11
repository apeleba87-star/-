/**
 * 현장거래 "업무 종류" — 정기청소 종류 / 일회성 청소 종류 두 그룹.
 * 각 그룹은 main slug(정기=regular, 일회성=one_time)와 옵션 목록을 가짐.
 */

export type ListingCategoryGroupId = "regular" | "one_time";

export interface ListingCategoryOption {
  key: string;
  label: string;
  /** categories 소분류 slug(있으면 매핑, 없으면 custom_subcategory_text로 저장) */
  subSlug?: string;
}

export interface ListingCategoryGroup {
  id: ListingCategoryGroupId;
  label: string;
  /** categories 대분류 slug */
  mainSlug: string;
  options: ListingCategoryOption[];
}

/** 정기청소 종류 */
export const REGULAR_OPTIONS: ListingCategoryOption[] = [
  { key: "office", label: "사무실청소", subSlug: "office" },
  { key: "stairs", label: "계단청소" },
  { key: "restaurant", label: "식당청소" },
  { key: "academy", label: "학원청소" },
  { key: "factory", label: "공장청소" },
  { key: "cafe", label: "카페청소" },
  { key: "disinfection", label: "소독·방역", subSlug: "disinfection" },
  { key: "__other__", label: "기타" },
];

/** 일회성 청소 종류 */
export const ONE_TIME_OPTIONS: ListingCategoryOption[] = [
  { key: "move_in", label: "입주 청소", subSlug: "move_in" },
  { key: "window", label: "유리창 청소", subSlug: "window" },
  { key: "completion", label: "준공 청소", subSlug: "completion" },
  { key: "school", label: "학교 청소" },
  { key: "exterior", label: "외벽 청소", subSlug: "exterior" },
  { key: "sign_awning", label: "간판·어닝 청소" },
  { key: "disinfection", label: "소독·방역", subSlug: "disinfection" },
  { key: "__other__", label: "기타" },
];

export const LISTING_CATEGORY_GROUPS: ListingCategoryGroup[] = [
  { id: "regular", label: "정기청소 종류", mainSlug: "regular", options: REGULAR_OPTIONS },
  { id: "one_time", label: "일회성 청소 종류", mainSlug: "one_time", options: ONE_TIME_OPTIONS },
];

export const LISTING_CATEGORY_OTHER = "__other__" as const;

export function getOptionByKey(
  groupId: ListingCategoryGroupId,
  optionKey: string
): ListingCategoryOption | undefined {
  const group = LISTING_CATEGORY_GROUPS.find((g) => g.id === groupId);
  return group?.options.find((o) => o.key === optionKey);
}

export function getGroupById(id: ListingCategoryGroupId): ListingCategoryGroup | undefined {
  return LISTING_CATEGORY_GROUPS.find((g) => g.id === id);
}
