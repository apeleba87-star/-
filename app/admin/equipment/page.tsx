import AdminEquipmentPanel from "@/components/admin/AdminEquipmentPanel";
import {
  listEquipmentCatalogItems,
  listEquipmentCategories,
} from "@/lib/knowledge-hub/equipment/catalog";
import {
  listAdminEquipment,
  listAdminEquipmentModels,
} from "@/lib/knowledge-hub/equipment/equipment-store";

export const dynamic = "force-dynamic";

export default async function AdminEquipmentPage() {
  const [equipment, models] = await Promise.all([
    listAdminEquipment(),
    listAdminEquipmentModels(),
  ]);

  const plannedCount = listEquipmentCatalogItems({ includePlanned: true }).filter(
    (i) => i.status === "planned"
  ).length;

  const categories = listEquipmentCategories().map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <AdminEquipmentPanel
      equipment={equipment.map((e) => ({
        id: e.id,
        categoryId: e.categoryId,
        name: e.name,
        aliases: e.aliases ?? [],
        summary: e.summary,
        whatIs: e.whatIs,
        placeHints: e.placeHints,
        jobHints: e.jobHints,
        selectionCriteria: e.selectionCriteria,
        useSteps: e.useSteps,
        beginnerMistakes: e.beginnerMistakes,
        warnings: e.warnings,
        relatedProductIds: e.relatedProductIds ?? [],
        relatedEquipmentIds: e.relatedEquipmentIds ?? [],
        confidence: e.confidence,
        status: e.status,
        catalogOrigin: e.catalogOrigin,
        hasDbRow: e.hasDbRow,
        isDeleted: e.isDeleted,
      }))}
      models={models.map((m) => ({
        id: m.id,
        equipmentId: m.equipmentId,
        brand: m.brand,
        name: m.name,
        aliases: m.aliases ?? [],
        summary: m.summary,
        bestFor: m.bestFor,
        selectionNotes: m.selectionNotes,
        cautions: m.cautions,
        relatedEquipmentIds: m.relatedEquipmentIds ?? [],
        salesUrl: m.salesUrl ?? null,
        salesLabel: m.salesLabel ?? null,
        confidence: m.confidence,
        status: m.status,
        catalogOrigin: m.catalogOrigin,
        hasDbRow: m.hasDbRow,
        isDeleted: m.isDeleted,
      }))}
      categories={categories}
      plannedCount={plannedCount}
    />
  );
}
