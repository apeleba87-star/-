import { Suspense } from "react";
import EquipmentCatalog from "@/components/knowledge-hub/EquipmentCatalog";
import {
  categoryLabel,
  listEquipmentCategories,
  listPublishedEquipmentModels,
  listPublishedEquipmentWithMedia,
} from "@/lib/knowledge-hub/equipment/catalog";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "청소장비 | 클린아이덱스",
  description:
    "습식청소기·마루광택기·고압세척기 등 청소장비 선택·사용·실수 예방. 작업에 맞는 장비를 고르는 가이드.",
  path: "/equipment",
});

export default async function EquipmentHubPage() {
  const [equipment, categories, models] = await Promise.all([
    listPublishedEquipmentWithMedia(),
    Promise.resolve(listEquipmentCategories()),
    listPublishedEquipmentModels(),
  ]);

  const modelCountByEq = new Map<string, number>();
  for (const m of models) {
    modelCountByEq.set(m.equipmentId, (modelCountByEq.get(m.equipmentId) ?? 0) + 1);
  }

  const items = equipment.map((e) => ({
    id: e.id,
    name: e.name,
    categoryId: e.categoryId,
    categoryName: categoryLabel(e.categoryId),
    summary: e.summary,
    placeHints: e.placeHints,
    jobHints: e.jobHints,
    imageUrl: e.imageUrl ?? null,
    modelCount: modelCountByEq.get(e.id) ?? 0,
  }));

  const tabs = [
    { id: "" as const, name: "전체" },
    ...categories.map((c) => ({ id: c.id, name: c.name, blurb: c.blurb })),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      <Suspense
        fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-9 w-40 rounded bg-slate-200" />
            <div className="h-12 rounded-2xl bg-slate-100" />
            <div className="h-40 rounded-3xl bg-slate-100" />
          </div>
        }
      >
        <EquipmentCatalog items={items} categories={tabs} />
      </Suspense>
    </div>
  );
}
