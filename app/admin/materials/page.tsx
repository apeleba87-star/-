import AdminMaterialsPanel, {
  type AdminMaterialItem,
} from "@/components/admin/AdminMaterialsPanel";
import { listMaterials } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { getMaterialSurfaceGuide } from "@/lib/knowledge-hub/materials/guides";
import { listAllDbMaterialGuides } from "@/lib/knowledge-hub/materials/store";

export default async function AdminMaterialsPage() {
  const dbGuides = await listAllDbMaterialGuides();
  const dbMap = new Map(dbGuides.filter((g) => g.status !== "archived").map((g) => [g.materialId, g]));

  const materials: AdminMaterialItem[] = listMaterials().map((m) => {
    const db = dbMap.get(m.id);
    const seed = getMaterialSurfaceGuide(m.id);
    if (db) {
      return {
        materialId: m.id,
        name: m.name,
        riskLevel: m.riskLevel,
        principle: db.principle,
        donts: db.donts,
        okHints: db.okHints,
        care: db.care,
        status: db.status,
        source: "db",
      };
    }
    return {
      materialId: m.id,
      name: m.name,
      riskLevel: m.riskLevel,
      principle: seed?.principle ?? "",
      donts: seed?.donts ?? [],
      okHints: seed?.okHints ?? [],
      care: seed?.care ?? [],
      status: "published",
      source: "seed",
    };
  });

  return <AdminMaterialsPanel materials={materials} />;
}
