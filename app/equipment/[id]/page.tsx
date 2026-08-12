import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EquipmentDetailView from "@/components/knowledge-hub/EquipmentDetailView";
import {
  categoryLabel,
  getEquipmentByIdWithMedia,
  listModelsForEquipment,
  listPublishedEquipment,
} from "@/lib/knowledge-hub/equipment/catalog";
import { getMergedProductById } from "@/lib/knowledge-hub/product-catalog";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const list = await listPublishedEquipment();
  return list.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const e = await getEquipmentByIdWithMedia(id);
  if (!e) return { title: "청소장비" };
  return buildPageMetadata({
    title: `${e.name} | 청소장비 | 클린아이덱스`,
    description: e.summary,
    path: `/equipment/${e.id}`,
  });
}

export default async function EquipmentDetailPage({ params }: Props) {
  const { id } = await params;
  const equipment = await getEquipmentByIdWithMedia(id);
  if (!equipment) notFound();

  const [models, published] = await Promise.all([
    listModelsForEquipment(equipment.id),
    listPublishedEquipment(),
  ]);

  const relatedEquipment = (equipment.relatedEquipmentIds ?? [])
    .map((rid) => {
      const hit = published.find((x) => x.id === rid);
      if (!hit) return null;
      return { id: hit.id, name: hit.name, href: `/equipment/${hit.id}` };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const relatedProducts = [];
  for (const pid of equipment.relatedProductIds ?? []) {
    const p = await getMergedProductById(pid);
    if (p && p.status !== "draft") {
      relatedProducts.push({
        id: p.id,
        name: p.name,
        href: `/products/${p.id}`,
        subtitle: p.brand,
      });
    }
  }

  return (
    <div className="px-0 py-0 sm:py-0">
      <EquipmentDetailView
        equipment={equipment}
        categoryName={categoryLabel(equipment.categoryId)}
        models={models}
        relatedEquipment={relatedEquipment}
        relatedProducts={relatedProducts}
      />
    </div>
  );
}
