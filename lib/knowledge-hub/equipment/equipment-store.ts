import { unstable_cache } from "next/cache";
import { createServiceSupabase } from "@/lib/supabase-server";
import type { Confidence } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import type {
  EquipmentCategoryId,
  KnowledgeEquipment,
  KnowledgeEquipmentModel,
} from "@/lib/knowledge-hub/equipment/types";
import equipmentSeed from "@/lib/knowledge-hub/equipment/source/equipment.parsed.json";
import modelsSeed from "@/lib/knowledge-hub/equipment/source/equipment-models.parsed.json";

export const EQUIPMENT_CATALOG_CACHE_TAG = "cleaning-equipment";
const REVALIDATE_SEC = 3600;

export type CatalogOrigin = "source" | "source_override" | "admin";

export type EquipmentAdminItem = KnowledgeEquipment & {
  catalogOrigin: CatalogOrigin;
  hasDbRow: boolean;
  isDeleted: boolean;
};

export type EquipmentModelAdminItem = KnowledgeEquipmentModel & {
  catalogOrigin: CatalogOrigin;
  hasDbRow: boolean;
  isDeleted: boolean;
};

const EQUIPMENT_SELECT =
  "id, origin, category_id, name, aliases, summary, what_is, place_hints, job_hints, selection_criteria, use_steps, beginner_mistakes, warnings, related_product_ids, related_equipment_ids, contaminant_ids, material_ids, place_job_hints, confidence, status, deleted_at";

const MODEL_SELECT =
  "id, origin, equipment_id, brand, name, aliases, summary, best_for, selection_notes, cautions, related_equipment_ids, sales_url, sales_label, confidence, status, deleted_at";

const CATEGORIES: EquipmentCategoryId[] = ["heavy", "hand", "consumable", "accessory"];
const CONFIDENCES: Confidence[] = ["high", "medium", "low"];
const STATUSES = ["active", "draft", "planned"] as const;
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type DbEquipmentRow = {
  id: string;
  origin: "source_override" | "admin";
  category_id: string;
  name: string;
  aliases: string[] | null;
  summary: string | null;
  what_is: string | null;
  place_hints: string[] | null;
  job_hints: string[] | null;
  selection_criteria: string[] | null;
  use_steps: string[] | null;
  beginner_mistakes: string[] | null;
  warnings: string[] | null;
  related_product_ids: string[] | null;
  related_equipment_ids: string[] | null;
  contaminant_ids: string[] | null;
  material_ids: string[] | null;
  place_job_hints: string[] | null;
  confidence: string;
  status: string;
  deleted_at: string | null;
};

type DbModelRow = {
  id: string;
  origin: "source_override" | "admin";
  equipment_id: string;
  brand: string;
  name: string;
  aliases: string[] | null;
  summary: string | null;
  best_for: string[] | null;
  selection_notes: string[] | null;
  cautions: string[] | null;
  related_equipment_ids: string[] | null;
  sales_url: string | null;
  sales_label: string | null;
  confidence: string;
  status: string;
  deleted_at: string | null;
};

function strArr(v: string[] | null | undefined): string[] {
  return (v ?? []).map((s) => s.trim()).filter(Boolean);
}

function asConfidence(v: unknown): Confidence {
  return CONFIDENCES.includes(v as Confidence) ? (v as Confidence) : "medium";
}

function asStatus(v: unknown): KnowledgeEquipment["status"] {
  return STATUSES.includes(v as (typeof STATUSES)[number])
    ? (v as KnowledgeEquipment["status"])
    : "draft";
}

function asCategory(v: unknown): EquipmentCategoryId {
  return CATEGORIES.includes(v as EquipmentCategoryId) ? (v as EquipmentCategoryId) : "heavy";
}

export function listSourceEquipment(): KnowledgeEquipment[] {
  return equipmentSeed as KnowledgeEquipment[];
}

export function listSourceEquipmentModels(): KnowledgeEquipmentModel[] {
  return modelsSeed as KnowledgeEquipmentModel[];
}

function rowToEquipment(row: DbEquipmentRow): KnowledgeEquipment {
  return {
    id: row.id,
    categoryId: asCategory(row.category_id),
    name: row.name,
    aliases: strArr(row.aliases),
    summary: row.summary ?? "",
    whatIs: row.what_is ?? "",
    placeHints: strArr(row.place_hints),
    jobHints: strArr(row.job_hints),
    selectionCriteria: strArr(row.selection_criteria),
    useSteps: strArr(row.use_steps),
    beginnerMistakes: strArr(row.beginner_mistakes),
    warnings: strArr(row.warnings),
    relatedProductIds: strArr(row.related_product_ids),
    relatedEquipmentIds: strArr(row.related_equipment_ids),
    contaminantIds: strArr(row.contaminant_ids),
    materialIds: strArr(row.material_ids),
    placeJobHints: strArr(row.place_job_hints),
    confidence: asConfidence(row.confidence),
    status: asStatus(row.status),
  };
}

function rowToModel(row: DbModelRow): KnowledgeEquipmentModel {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    brand: row.brand,
    name: row.name,
    aliases: strArr(row.aliases),
    summary: row.summary ?? "",
    bestFor: strArr(row.best_for),
    selectionNotes: strArr(row.selection_notes),
    cautions: strArr(row.cautions),
    relatedEquipmentIds: strArr(row.related_equipment_ids),
    salesUrl: row.sales_url,
    salesLabel: row.sales_label,
    confidence: asConfidence(row.confidence),
    status: asStatus(row.status),
  };
}

async function loadDbEquipment(includeDeleted: boolean): Promise<DbEquipmentRow[]> {
  try {
    const supabase = createServiceSupabase();
    let q = supabase.from("cleaning_equipment").select(EQUIPMENT_SELECT);
    if (!includeDeleted) q = q.is("deleted_at", null);
    const { data, error } = await q;
    if (error || !data) return [];
    return data as DbEquipmentRow[];
  } catch {
    return [];
  }
}

async function loadDbModels(includeDeleted: boolean): Promise<DbModelRow[]> {
  try {
    const supabase = createServiceSupabase();
    let q = supabase.from("cleaning_equipment_models").select(MODEL_SELECT);
    if (!includeDeleted) q = q.is("deleted_at", null);
    const { data, error } = await q;
    if (error || !data) return [];
    return data as DbModelRow[];
  } catch {
    return [];
  }
}

function mergeEquipment(
  source: KnowledgeEquipment[],
  rows: DbEquipmentRow[],
  opts?: { includeDeleted?: boolean }
): EquipmentAdminItem[] {
  const byId = new Map<string, EquipmentAdminItem>();

  for (const s of source) {
    byId.set(s.id, {
      ...s,
      catalogOrigin: "source",
      hasDbRow: false,
      isDeleted: false,
    });
  }

  for (const row of rows) {
    const deleted = Boolean(row.deleted_at);
    if (deleted && !opts?.includeDeleted) {
      byId.delete(row.id);
      continue;
    }
    byId.set(row.id, {
      ...rowToEquipment(row),
      catalogOrigin: row.origin,
      hasDbRow: true,
      isDeleted: deleted,
    });
  }

  return [...byId.values()];
}

function mergeModels(
  source: KnowledgeEquipmentModel[],
  rows: DbModelRow[],
  opts?: { includeDeleted?: boolean }
): EquipmentModelAdminItem[] {
  const byId = new Map<string, EquipmentModelAdminItem>();

  for (const s of source) {
    byId.set(s.id, {
      ...s,
      catalogOrigin: "source",
      hasDbRow: false,
      isDeleted: false,
    });
  }

  for (const row of rows) {
    const deleted = Boolean(row.deleted_at);
    if (deleted && !opts?.includeDeleted) {
      byId.delete(row.id);
      continue;
    }
    byId.set(row.id, {
      ...rowToModel(row),
      catalogOrigin: row.origin,
      hasDbRow: true,
      isDeleted: deleted,
    });
  }

  return [...byId.values()];
}

async function loadMergedEquipmentPublished(): Promise<KnowledgeEquipment[]> {
  const rows = await loadDbEquipment(false);
  return mergeEquipment(listSourceEquipment(), rows)
    .filter((e) => !e.isDeleted && e.status === "active")
    .map(({ catalogOrigin: _o, hasDbRow: _h, isDeleted: _d, ...e }) => e);
}

async function loadMergedModelsPublished(): Promise<KnowledgeEquipmentModel[]> {
  const rows = await loadDbModels(false);
  return mergeModels(listSourceEquipmentModels(), rows)
    .filter((m) => !m.isDeleted && m.status === "active")
    .map(({ catalogOrigin: _o, hasDbRow: _h, isDeleted: _d, ...m }) => m);
}

export function listMergedPublishedEquipment(): Promise<KnowledgeEquipment[]> {
  return unstable_cache(loadMergedEquipmentPublished, ["cleaning-equipment-merged"], {
    revalidate: REVALIDATE_SEC,
    tags: [EQUIPMENT_CATALOG_CACHE_TAG],
  })();
}

export function listMergedPublishedModels(): Promise<KnowledgeEquipmentModel[]> {
  return unstable_cache(loadMergedModelsPublished, ["cleaning-equipment-models-merged"], {
    revalidate: REVALIDATE_SEC,
    tags: [EQUIPMENT_CATALOG_CACHE_TAG],
  })();
}

export async function getMergedEquipmentById(id: string): Promise<KnowledgeEquipment | null> {
  const all = await listMergedPublishedEquipment();
  return all.find((e) => e.id === id) ?? null;
}

export async function getMergedModelById(id: string): Promise<KnowledgeEquipmentModel | null> {
  const all = await listMergedPublishedModels();
  return all.find((m) => m.id === id) ?? null;
}

export async function listAdminEquipment(): Promise<EquipmentAdminItem[]> {
  const rows = await loadDbEquipment(true);
  return mergeEquipment(listSourceEquipment(), rows, { includeDeleted: true }).filter(
    (e) => !e.isDeleted || e.hasDbRow
  );
}

export async function listAdminEquipmentModels(): Promise<EquipmentModelAdminItem[]> {
  const rows = await loadDbModels(true);
  return mergeModels(listSourceEquipmentModels(), rows, { includeDeleted: true }).filter(
    (m) => !m.isDeleted || m.hasDbRow
  );
}

export type EquipmentUpsertInput = {
  id: string;
  categoryId: EquipmentCategoryId | string;
  name: string;
  aliases?: string[];
  summary?: string;
  whatIs?: string;
  placeHints?: string[];
  jobHints?: string[];
  selectionCriteria?: string[];
  useSteps?: string[];
  beginnerMistakes?: string[];
  warnings?: string[];
  relatedProductIds?: string[];
  relatedEquipmentIds?: string[];
  contaminantIds?: string[];
  materialIds?: string[];
  placeJobHints?: string[];
  confidence?: Confidence | string;
  status?: KnowledgeEquipment["status"] | string;
};

export type EquipmentModelUpsertInput = {
  id: string;
  equipmentId: string;
  brand: string;
  name: string;
  aliases?: string[];
  summary?: string;
  bestFor?: string[];
  selectionNotes?: string[];
  cautions?: string[];
  relatedEquipmentIds?: string[];
  salesUrl?: string | null;
  salesLabel?: string | null;
  confidence?: Confidence | string;
  status?: KnowledgeEquipmentModel["status"] | string;
};

export async function upsertEquipment(
  input: EquipmentUpsertInput,
  userId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const id = input.id?.trim().toLowerCase();
  if (!id || !ID_RE.test(id)) {
    return { ok: false, error: "장비 ID는 소문자·숫자·하이픈만 가능합니다. (예: wet-vac)" };
  }
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "장비명은 필수입니다." };

  const source = listSourceEquipment().find((e) => e.id === id);
  const origin: "source_override" | "admin" = source ? "source_override" : "admin";

  const supabase = createServiceSupabase();
  const { error } = await supabase.from("cleaning_equipment").upsert(
    {
      id,
      origin,
      category_id: asCategory(input.categoryId),
      name,
      aliases: strArr(input.aliases),
      summary: input.summary?.trim() ?? "",
      what_is: input.whatIs?.trim() ?? "",
      place_hints: strArr(input.placeHints),
      job_hints: strArr(input.jobHints),
      selection_criteria: strArr(input.selectionCriteria),
      use_steps: strArr(input.useSteps),
      beginner_mistakes: strArr(input.beginnerMistakes),
      warnings: strArr(input.warnings),
      related_product_ids: strArr(input.relatedProductIds),
      related_equipment_ids: strArr(input.relatedEquipmentIds),
      contaminant_ids: strArr(input.contaminantIds),
      material_ids: strArr(input.materialIds),
      place_job_hints: strArr(input.placeJobHints),
      confidence: asConfidence(input.confidence),
      status: asStatus(input.status),
      deleted_at: null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, id };
}

export async function upsertEquipmentModel(
  input: EquipmentModelUpsertInput,
  userId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const id = input.id?.trim().toLowerCase();
  if (!id || !ID_RE.test(id)) {
    return { ok: false, error: "기종 ID는 소문자·숫자·하이픈만 가능합니다. (예: numatic-wv470)" };
  }
  const equipmentId = input.equipmentId?.trim().toLowerCase();
  if (!equipmentId || !ID_RE.test(equipmentId)) {
    return { ok: false, error: "상위 장비 ID가 필요합니다." };
  }
  const brand = input.brand?.trim();
  const name = input.name?.trim();
  if (!brand || !name) return { ok: false, error: "브랜드와 기종명은 필수입니다." };

  const source = listSourceEquipmentModels().find((m) => m.id === id);
  const origin: "source_override" | "admin" = source ? "source_override" : "admin";

  const supabase = createServiceSupabase();
  const { error } = await supabase.from("cleaning_equipment_models").upsert(
    {
      id,
      origin,
      equipment_id: equipmentId,
      brand,
      name,
      aliases: strArr(input.aliases),
      summary: input.summary?.trim() ?? "",
      best_for: strArr(input.bestFor),
      selection_notes: strArr(input.selectionNotes),
      cautions: strArr(input.cautions),
      related_equipment_ids: strArr(input.relatedEquipmentIds),
      sales_url: input.salesUrl?.trim() || null,
      sales_label: input.salesLabel?.trim() || null,
      confidence: asConfidence(input.confidence),
      status: asStatus(input.status),
      deleted_at: null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, id };
}

export async function softDeleteEquipment(
  id: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = id.trim();
  if (!trimmed) return { ok: false, error: "장비 ID가 필요합니다." };

  const source = listSourceEquipment().find((e) => e.id === trimmed);
  const supabase = createServiceSupabase();
  const { data: existing } = await supabase
    .from("cleaning_equipment")
    .select("id")
    .eq("id", trimmed)
    .maybeSingle();

  if (!existing && !source) return { ok: false, error: "장비를 찾을 수 없습니다." };

  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from("cleaning_equipment")
      .update({ deleted_at: now, updated_by: userId, updated_at: now })
      .eq("id", trimmed);
    if (error) return { ok: false, error: error.message };
  } else if (source) {
    const { error } = await supabase.from("cleaning_equipment").upsert(
      {
        id: trimmed,
        origin: "source_override",
        category_id: source.categoryId,
        name: source.name,
        aliases: source.aliases ?? [],
        summary: source.summary,
        what_is: source.whatIs,
        place_hints: source.placeHints,
        job_hints: source.jobHints,
        selection_criteria: source.selectionCriteria,
        use_steps: source.useSteps,
        beginner_mistakes: source.beginnerMistakes,
        warnings: source.warnings,
        related_product_ids: source.relatedProductIds ?? [],
        related_equipment_ids: source.relatedEquipmentIds ?? [],
        contaminant_ids: source.contaminantIds ?? [],
        material_ids: source.materialIds ?? [],
        place_job_hints: source.placeJobHints ?? [],
        confidence: source.confidence,
        status: source.status,
        deleted_at: now,
        updated_by: userId,
        updated_at: now,
      },
      { onConflict: "id" }
    );
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function softDeleteEquipmentModel(
  id: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = id.trim();
  if (!trimmed) return { ok: false, error: "기종 ID가 필요합니다." };

  const source = listSourceEquipmentModels().find((m) => m.id === trimmed);
  const supabase = createServiceSupabase();
  const { data: existing } = await supabase
    .from("cleaning_equipment_models")
    .select("id")
    .eq("id", trimmed)
    .maybeSingle();

  if (!existing && !source) return { ok: false, error: "기종을 찾을 수 없습니다." };

  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from("cleaning_equipment_models")
      .update({ deleted_at: now, updated_by: userId, updated_at: now })
      .eq("id", trimmed);
    if (error) return { ok: false, error: error.message };
  } else if (source) {
    const { error } = await supabase.from("cleaning_equipment_models").upsert(
      {
        id: trimmed,
        origin: "source_override",
        equipment_id: source.equipmentId,
        brand: source.brand,
        name: source.name,
        aliases: source.aliases ?? [],
        summary: source.summary,
        best_for: source.bestFor,
        selection_notes: source.selectionNotes,
        cautions: source.cautions,
        related_equipment_ids: source.relatedEquipmentIds ?? [],
        sales_url: source.salesUrl ?? null,
        sales_label: source.salesLabel ?? null,
        confidence: source.confidence,
        status: source.status,
        deleted_at: now,
        updated_by: userId,
        updated_at: now,
      },
      { onConflict: "id" }
    );
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function restoreEquipment(
  id: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceSupabase();
  const { error } = await supabase
    .from("cleaning_equipment")
    .update({ deleted_at: null, updated_by: userId, updated_at: new Date().toISOString() })
    .eq("id", id.trim());
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function restoreEquipmentModel(
  id: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceSupabase();
  const { error } = await supabase
    .from("cleaning_equipment_models")
    .update({ deleted_at: null, updated_by: userId, updated_at: new Date().toISOString() })
    .eq("id", id.trim());
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
