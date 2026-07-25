export type { MaterialGroupId } from "@/lib/knowledge-hub/materials/groups";
export {
  MATERIAL_GROUP_ORDER,
  MATERIAL_GROUP_LABEL,
  MATERIAL_GROUP_BLURB,
  getMaterialGroupId,
  getMaterialGroupLabel,
} from "@/lib/knowledge-hub/materials/groups";
export type { MaterialSurfaceGuide } from "@/lib/knowledge-hub/materials/guides";
export {
  getMaterialSurfaceGuide,
  listMaterialSurfaceGuides,
} from "@/lib/knowledge-hub/materials/guides";
export type { MaterialGuideRecord, MaterialGuideStatus } from "@/lib/knowledge-hub/materials/types";
export { getMergedMaterialSurfaceGuide } from "@/lib/knowledge-hub/materials/get-merged-guides";
export { getMaterialDetailData } from "@/lib/knowledge-hub/materials/get-material-detail";
export type {
  MaterialDetailData,
  MaterialProductCard,
  MaterialContaminantCard,
  MaterialRecipeCard,
} from "@/lib/knowledge-hub/materials/get-material-detail";
