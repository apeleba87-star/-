import type {
  SolutionPart,
  SolutionPlace,
  SolutionSpace,
  SolutionSpaceId,
} from "@/lib/knowledge-hub/solutions/types";

export const SOLUTION_PLACES: SolutionPlace[] = [
  { id: "home", name: "가정집" },
  { id: "shop", name: "상가" },
  { id: "office", name: "사무실" },
  { id: "hospital", name: "병원" },
  { id: "school", name: "학교" },
  { id: "public", name: "공중" },
  { id: "childcare", name: "어린이시설" },
];

export const SOLUTION_SPACES: SolutionSpace[] = [
  { id: "restroom", name: "화장실·욕실" },
  { id: "bathroom", name: "화장실·욕실" },
  { id: "kitchen", name: "주방" },
  { id: "living", name: "거실" },
  { id: "bedroom", name: "침실" },
  { id: "entrance", name: "현관" },
  { id: "balcony", name: "베란다" },
  { id: "laundry", name: "세탁실·다용도실" },
  { id: "utility", name: "세탁실·다용도실" },
  { id: "windows", name: "창·샷시" },
  { id: "study", name: "서재·공부방" },
  { id: "dressroom", name: "드레스룸" },
  { id: "pantry", name: "팬트리" },
  { id: "office-floor", name: "사무공간" },
  { id: "waiting", name: "대기실" },
  { id: "clinic", name: "진료실" },
];

/** 가정집: 화장실·욕실 동일 */
export const HOME_BATH_SPACE_IDS: SolutionSpaceId[] = ["restroom", "bathroom"];

/** 가정집: 세탁실·다용도실 동일 */
export const HOME_UTILITY_SPACE_IDS: SolutionSpaceId[] = ["laundry", "utility"];

/** 가정집 추천 구역 순서 */
export const HOME_SPACE_ORDER: SolutionSpaceId[] = [
  "restroom",
  "kitchen",
  "living",
  "bedroom",
  "entrance",
  "balcony",
  "laundry",
  "windows",
  "study",
  "dressroom",
  "pantry",
];

export const HOME_SPACE_LABELS: Partial<Record<SolutionSpaceId, string>> = {
  restroom: "화장실·욕실",
  bathroom: "화장실·욕실",
  kitchen: "주방",
  living: "거실",
  bedroom: "침실",
  entrance: "현관",
  balcony: "베란다",
  laundry: "세탁실·다용도실",
  utility: "세탁실·다용도실",
  windows: "창·샷시",
  study: "서재·공부방",
  dressroom: "드레스룸",
  pantry: "팬트리",
};

export const SOLUTION_PARTS: SolutionPart[] = [
  { id: "toilet", name: "변기", defaultMaterialId: "porcelain", aliases: ["양변기"] },
  { id: "urinal", name: "소변기", defaultMaterialId: "porcelain" },
  { id: "sink", name: "세면대", defaultMaterialId: "porcelain", aliases: ["싱크대", "싱크볼"] },
  { id: "faucet", name: "수전", defaultMaterialId: "chrome-faucet", aliases: ["싱크대 수전"] },
  { id: "mirror", name: "거울", defaultMaterialId: "glass" },
  { id: "shower-booth", name: "샤워부스", defaultMaterialId: "glass" },
  { id: "bathtub", name: "욕조", defaultMaterialId: "enamel" },
  { id: "silicone", name: "실리콘", defaultMaterialId: "silicone" },
  { id: "grout", name: "줄눈", defaultMaterialId: "grout" },
  { id: "tile", name: "타일", defaultMaterialId: "ceramic-tile", aliases: ["주방 타일"] },
  { id: "ceiling", name: "천장", defaultMaterialId: "painted-wall" },
  { id: "fan", name: "환풍기", defaultMaterialId: "plastic" },
  { id: "floor", name: "바닥", defaultMaterialId: "ceramic-tile" },
  { id: "drain", name: "배수구" },
  { id: "hood", name: "후드" },
  { id: "countertop", name: "상판" },
  { id: "carpet", name: "카펫", defaultMaterialId: "carpet" },
  { id: "desk", name: "데스크", defaultMaterialId: "laminate-wood" },
  { id: "chair", name: "의자" },
  { id: "glass-door", name: "유리문", defaultMaterialId: "glass" },
  { id: "blind", name: "블라인드" },
  { id: "pvc-mat", name: "PVC매트", defaultMaterialId: "pvc-deco" },
  { id: "play-equipment", name: "놀이기구", defaultMaterialId: "plastic" },
  { id: "window", name: "유리창", defaultMaterialId: "glass" },
  { id: "sash-rail", name: "샷시·창틀" },
  { id: "screen", name: "방충망" },
  { id: "aircon", name: "에어컨" },
  { id: "wallpaper", name: "벽지", defaultMaterialId: "painted-wall" },
  { id: "shoe-cabinet", name: "신발장" },
  { id: "mattress", name: "매트리스" },
  { id: "sofa", name: "소파" },
  { id: "lighting", name: "조명" },
  { id: "molding", name: "몰딩" },
  { id: "outlet", name: "콘센트" },
  { id: "door-frame", name: "문틀" },
  { id: "closet", name: "옷장·수납" },
];

export function getPlaceLabel(id: string): string {
  return SOLUTION_PLACES.find((p) => p.id === id)?.name ?? id;
}

export function getSpaceLabel(id: string, placeId?: string): string {
  if (placeId === "home") {
    const home = HOME_SPACE_LABELS[id as SolutionSpaceId];
    if (home) return home;
  }
  if (id === "restroom" && placeId === "shop") return "화장실";
  return SOLUTION_SPACES.find((s) => s.id === id)?.name ?? id;
}

/** 공간별로 같은 partId라도 표기명이 다른 경우 (주방 싱크대 vs 화장실 세면대) */
export const SPACE_PART_LABELS: Partial<
  Record<SolutionSpaceId, Partial<Record<SolutionPart["id"], string>>>
> = {
  kitchen: {
    sink: "싱크대",
    faucet: "싱크대 수전",
    countertop: "상판",
    hood: "후드",
    tile: "주방 타일",
    drain: "배수구",
  },
};

/** 주방 부위 선택 순서 */
export const KITCHEN_PART_ORDER: SolutionPart["id"][] = [
  "sink",
  "faucet",
  "countertop",
  "hood",
  "tile",
  "drain",
];

export function getPartLabel(id: string, spaceId?: string): string {
  if (spaceId) {
    const bySpace = SPACE_PART_LABELS[spaceId as SolutionSpaceId]?.[id as SolutionPart["id"]];
    if (bySpace) return bySpace;
  }
  return SOLUTION_PARTS.find((p) => p.id === id)?.name ?? id;
}

export function spaceIdsForUiSelection(placeId: string, selectedSpaceId: string): string[] {
  if (placeId === "home" && HOME_BATH_SPACE_IDS.includes(selectedSpaceId as SolutionSpaceId)) {
    return [...HOME_BATH_SPACE_IDS];
  }
  if (placeId === "home" && HOME_UTILITY_SPACE_IDS.includes(selectedSpaceId as SolutionSpaceId)) {
    return [...HOME_UTILITY_SPACE_IDS];
  }
  return [selectedSpaceId];
}
