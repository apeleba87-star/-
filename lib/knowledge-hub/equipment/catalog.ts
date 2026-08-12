import categoriesDoc from "@/lib/knowledge-hub/equipment/source/equipment-categories.parsed.json";
import type {
  EquipmentCatalogItem,
  EquipmentCategory,
  EquipmentCategoryId,
  KnowledgeEquipment,
  KnowledgeEquipmentModel,
} from "@/lib/knowledge-hub/equipment/types";
import {
  getMergedEquipmentById,
  getMergedModelById,
  listMergedPublishedEquipment,
  listMergedPublishedModels,
} from "@/lib/knowledge-hub/equipment/equipment-store";
import { getKnowledgeMediaMap } from "@/lib/knowledge-hub/media/media-store";

const categories = categoriesDoc.categories as EquipmentCategory[];
const catalogItems = categoriesDoc.items as EquipmentCatalogItem[];

export function listEquipmentCategories(): EquipmentCategory[] {
  return [...categories].sort((a, b) => a.sort - b.sort);
}

export function listEquipmentCatalogItems(opts?: {
  categoryId?: EquipmentCategoryId;
  includePlanned?: boolean;
}): EquipmentCatalogItem[] {
  let rows = catalogItems;
  if (opts?.categoryId) {
    rows = rows.filter((i) => i.categoryId === opts.categoryId);
  }
  if (!opts?.includePlanned) {
    rows = rows.filter((i) => i.status === "active" || i.status === "draft");
  }
  return rows;
}

export function getEquipmentCatalogItem(id: string): EquipmentCatalogItem | null {
  return catalogItems.find((i) => i.id === id) ?? null;
}

export function categoryLabel(id: EquipmentCategoryId | string): string {
  return categories.find((c) => c.id === id)?.name ?? id;
}

/** 상세가 있는 공개 장비 (시드 + DB 오버레이) */
export async function listPublishedEquipment(): Promise<KnowledgeEquipment[]> {
  return listMergedPublishedEquipment();
}

export async function getEquipmentById(id: string): Promise<KnowledgeEquipment | null> {
  return getMergedEquipmentById(id);
}

export async function listPublishedEquipmentModels(): Promise<KnowledgeEquipmentModel[]> {
  return listMergedPublishedModels();
}

export async function listModelsForEquipment(
  equipmentId: string
): Promise<KnowledgeEquipmentModel[]> {
  const all = await listMergedPublishedModels();
  return all.filter((m) => m.equipmentId === equipmentId);
}

export async function getEquipmentModelById(id: string): Promise<KnowledgeEquipmentModel | null> {
  return getMergedModelById(id);
}

export async function listPublishedEquipmentWithMedia(): Promise<KnowledgeEquipment[]> {
  const [list, media] = await Promise.all([
    listPublishedEquipment(),
    getKnowledgeMediaMap("equipment"),
  ]);
  return list.map((e) => {
    const m = media[e.id];
    if (!m?.url) return e;
    return {
      ...e,
      imageUrl: m.url,
      imageAlt: m.alt ?? `${e.name} 장비 이미지`,
    };
  });
}

export async function getEquipmentByIdWithMedia(id: string): Promise<KnowledgeEquipment | null> {
  const e = await getEquipmentById(id);
  if (!e || e.status !== "active") return null;
  const media = await getKnowledgeMediaMap("equipment");
  const m = media[id];
  if (!m?.url) return e;
  return {
    ...e,
    imageUrl: m.url,
    imageAlt: m.alt ?? `${e.name} 장비 이미지`,
  };
}

export async function getEquipmentModelByIdWithMedia(
  id: string
): Promise<KnowledgeEquipmentModel | null> {
  const model = await getEquipmentModelById(id);
  if (!model) return null;
  const media = await getKnowledgeMediaMap("equipment");
  const m = media[id];
  if (!m?.url) return model;
  return {
    ...model,
    imageUrl: m.url,
    imageAlt: m.alt ?? `${model.brand} ${model.name}`,
  };
}
