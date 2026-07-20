/** 재질 허브용 군 — 클라이언트 안전 */

export const MATERIAL_GROUP_ORDER = [
  "tile",
  "stone",
  "metal",
  "floor",
  "glass",
  "other",
] as const;

export type MaterialGroupId = (typeof MATERIAL_GROUP_ORDER)[number];

export const MATERIAL_GROUP_LABEL: Record<MaterialGroupId, string> = {
  tile: "타일·도기",
  stone: "석재·콘크리트",
  metal: "금속",
  floor: "바닥·마루·카펫",
  glass: "유리·실리콘",
  other: "벽·가죽·플라스틱",
};

export const MATERIAL_GROUP_BLURB: Record<MaterialGroupId, string> = {
  tile: "변기·세면대·타일·줄눈",
  stone: "대리석·화강석·콘크리트",
  metal: "스테인레스·수전·알루미늄",
  floor: "에폭시·강마루·데코타일·카펫",
  glass: "유리·실리콘 줄",
  other: "페인트 벽·가죽·플라스틱",
};

const MATERIAL_TO_GROUP: Record<string, MaterialGroupId> = {
  porcelain: "tile",
  "ceramic-tile": "tile",
  grout: "tile",
  enamel: "tile",
  marble: "stone",
  granite: "stone",
  concrete: "stone",
  "exterior-wall": "stone",
  stainless: "metal",
  "chrome-faucet": "metal",
  aluminum: "metal",
  "brass-bronze": "metal",
  "epoxy-floor": "floor",
  "laminate-wood": "floor",
  "pvc-deco": "floor",
  carpet: "floor",
  glass: "glass",
  silicone: "glass",
  "painted-wall": "other",
  leather: "other",
  plastic: "other",
};

export function getMaterialGroupId(materialId: string): MaterialGroupId {
  return MATERIAL_TO_GROUP[materialId] ?? "other";
}

export function getMaterialGroupLabel(materialId: string): string {
  return MATERIAL_GROUP_LABEL[getMaterialGroupId(materialId)];
}
