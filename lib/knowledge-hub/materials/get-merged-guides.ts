import { getMaterialSurfaceGuide } from "@/lib/knowledge-hub/materials/guides";
import { getDbMaterialGuidesPublished } from "@/lib/knowledge-hub/materials/store";
import type { MaterialSurfaceGuide } from "@/lib/knowledge-hub/materials/guides";

/** Published DB overlay wins; otherwise seed. Archived rows are omitted from published query. */
export async function getMergedMaterialSurfaceGuide(
  materialId: string
): Promise<MaterialSurfaceGuide | undefined> {
  const dbRows = await getDbMaterialGuidesPublished();
  const db = dbRows.find((g) => g.materialId === materialId);
  if (db) {
    return {
      materialId: db.materialId,
      principle: db.principle,
      donts: db.donts,
      okHints: db.okHints,
      care: db.care,
    };
  }
  return getMaterialSurfaceGuide(materialId);
}
