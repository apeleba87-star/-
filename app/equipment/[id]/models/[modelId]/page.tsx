import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EquipmentModelDetailView from "@/components/knowledge-hub/EquipmentModelDetailView";
import {
  getEquipmentById,
  getEquipmentModelByIdWithMedia,
  listPublishedEquipment,
  listPublishedEquipmentModels,
} from "@/lib/knowledge-hub/equipment/catalog";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ id: string; modelId: string }> };

export async function generateStaticParams() {
  const models = await listPublishedEquipmentModels();
  return models.map((m) => ({
    id: m.equipmentId,
    modelId: m.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, modelId } = await params;
  const model = await getEquipmentModelByIdWithMedia(modelId);
  const equipment = await getEquipmentById(id);
  if (!model || !equipment || model.equipmentId !== equipment.id) {
    return { title: "청소장비 기종" };
  }
  return buildPageMetadata({
    title: `${model.brand} ${model.name} | ${equipment.name} | 클린아이덱스`,
    description: model.summary,
    path: `/equipment/${equipment.id}/models/${model.id}`,
  });
}

export default async function EquipmentModelDetailPage({ params }: Props) {
  const { id, modelId } = await params;
  const model = await getEquipmentModelByIdWithMedia(modelId);
  const equipment = await getEquipmentById(id);
  if (!model || !equipment || equipment.status !== "active" || model.equipmentId !== equipment.id) {
    notFound();
  }

  const published = await listPublishedEquipment();
  const relatedEquipment = (model.relatedEquipmentIds ?? [])
    .map((rid) => {
      const hit = published.find((x) => x.id === rid);
      if (!hit) return null;
      return { id: hit.id, name: hit.name, href: `/equipment/${hit.id}` };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return (
    <div className="px-0 py-0 sm:py-0">
      <EquipmentModelDetailView
        model={model}
        equipment={equipment}
        relatedEquipment={relatedEquipment}
      />
    </div>
  );
}
