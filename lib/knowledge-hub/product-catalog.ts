import { unstable_cache } from "next/cache";
import { createClient, createServiceSupabase } from "@/lib/supabase-server";
import { listSourceProducts } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import type {
  Confidence,
  KnowledgeProduct,
  PHType,
} from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { upsertProductSales } from "@/lib/knowledge-hub/product-sales";

export const PRODUCT_CATALOG_CACHE_TAG = "cleaning-products";
const PRODUCT_CATALOG_REVALIDATE_SEC = 3600;

const PRODUCT_SELECT =
  "id, origin, brand, name, aliases, ph_type, ph_approx, summary, main_use, compatible_material_ids, contaminant_ids, forbidden_material_ids, materials_raw, contaminants_raw, forbidden_raw, standard_dilution, strong_dilution, dwell_time, pack_sizes, warnings, confidence, status, deleted_at";

export type ProductCatalogOrigin = "source" | "source_override" | "admin";

export type ProductCatalogListItem = KnowledgeProduct & {
  catalogOrigin: ProductCatalogOrigin;
  hasDbRow: boolean;
  isDeleted: boolean;
};

type DbProductRow = {
  id: string;
  origin: "source_override" | "admin";
  brand: string;
  name: string;
  aliases: string[] | null;
  ph_type: string;
  ph_approx: string | null;
  summary: string | null;
  main_use: string[] | null;
  compatible_material_ids: string[] | null;
  contaminant_ids: string[] | null;
  forbidden_material_ids: string[] | null;
  materials_raw: string[] | null;
  contaminants_raw: string[] | null;
  forbidden_raw: string[] | null;
  standard_dilution: string | null;
  strong_dilution: string | null;
  dwell_time: string | null;
  pack_sizes: string[] | null;
  warnings: string[] | null;
  confidence: string;
  status: string;
  deleted_at: string | null;
};

const PH_TYPES: PHType[] = [
  "strong_acid",
  "acid",
  "neutral",
  "weak_alkaline",
  "alkaline",
  "strong_alkaline",
  "oxidizing",
  "unknown",
];

const CONFIDENCES: Confidence[] = ["high", "medium", "low"];
const STATUSES = ["active", "discontinued", "verify", "draft"] as const;

function asPhType(v: unknown): PHType {
  return PH_TYPES.includes(v as PHType) ? (v as PHType) : "unknown";
}

function asConfidence(v: unknown): Confidence {
  return CONFIDENCES.includes(v as Confidence) ? (v as Confidence) : "medium";
}

function asStatus(v: unknown): KnowledgeProduct["status"] {
  return STATUSES.includes(v as (typeof STATUSES)[number])
    ? (v as KnowledgeProduct["status"])
    : "active";
}

function strArr(v: string[] | null | undefined): string[] {
  return (v ?? []).map((s) => s.trim()).filter(Boolean);
}

function rowToProduct(row: DbProductRow): KnowledgeProduct {
  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    aliases: strArr(row.aliases),
    phType: asPhType(row.ph_type),
    phApprox: row.ph_approx,
    summary: row.summary ?? undefined,
    mainUse: strArr(row.main_use),
    compatibleMaterialIds: strArr(row.compatible_material_ids),
    contaminantIds: strArr(row.contaminant_ids),
    forbiddenMaterialIds: strArr(row.forbidden_material_ids),
    materialsRaw: strArr(row.materials_raw),
    contaminantsRaw: strArr(row.contaminants_raw),
    forbiddenRaw: strArr(row.forbidden_raw),
    standardDilution: row.standard_dilution ?? undefined,
    strongDilution: row.strong_dilution ?? undefined,
    dwellTime: row.dwell_time ?? undefined,
    packSizes: strArr(row.pack_sizes),
    warnings: strArr(row.warnings),
    confidence: asConfidence(row.confidence),
    status: asStatus(row.status),
  };
}

async function loadDbProductRows(includeDeleted = false): Promise<DbProductRow[]> {
  try {
    const supabase = includeDeleted ? createServiceSupabase() : createClient();
    let q = supabase.from("cleaning_products").select(PRODUCT_SELECT);
    if (!includeDeleted) q = q.is("deleted_at", null);
    const { data, error } = await q;
    if (error || !data) return [];
    return data as DbProductRow[];
  } catch {
    return [];
  }
}

function mergeProducts(
  source: KnowledgeProduct[],
  dbRows: DbProductRow[],
  opts?: { includeDeleted?: boolean }
): ProductCatalogListItem[] {
  const includeDeleted = opts?.includeDeleted ?? false;
  const map = new Map<string, ProductCatalogListItem>();

  for (const p of source) {
    map.set(p.id, {
      ...p,
      catalogOrigin: "source",
      hasDbRow: false,
      isDeleted: false,
    });
  }

  for (const row of dbRows) {
    const fromDb = rowToProduct(row);
    const deleted = Boolean(row.deleted_at);
    if (deleted && !includeDeleted) {
      map.delete(row.id);
      continue;
    }
    const prev = map.get(row.id);
    map.set(row.id, {
      ...(prev ?? fromDb),
      ...fromDb,
      sources: prev?.sources,
      sourceRefs: prev?.sourceRefs,
      catalogOrigin: row.origin,
      hasDbRow: true,
      isDeleted: deleted,
    });
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

async function loadMergedProducts(): Promise<KnowledgeProduct[]> {
  const rows = await loadDbProductRows(false);
  return mergeProducts(listSourceProducts(), rows).map(
    ({ catalogOrigin: _o, hasDbRow: _h, isDeleted: _d, ...p }) => p
  );
}

/** 공개·런타임용 병합 제품 목록 (삭제된 문서 제품 제외, 관리자 신규 포함) */
export function listMergedProducts(): Promise<KnowledgeProduct[]> {
  return unstable_cache(loadMergedProducts, ["cleaning-products-merged"], {
    revalidate: PRODUCT_CATALOG_REVALIDATE_SEC,
    tags: [PRODUCT_CATALOG_CACHE_TAG],
  })();
}

export async function getMergedProductById(id: string): Promise<KnowledgeProduct | undefined> {
  const all = await listMergedProducts();
  return all.find((p) => p.id === id);
}

/** 관리자 목록 — 삭제 포함, origin 표시 */
export async function listAdminCatalogProducts(): Promise<ProductCatalogListItem[]> {
  const rows = await loadDbProductRows(true);
  return mergeProducts(listSourceProducts(), rows, { includeDeleted: true }).filter(
    (p) => !p.isDeleted || p.hasDbRow
  );
}

export type ProductUpsertInput = {
  id: string;
  brand: string;
  name: string;
  aliases?: string[];
  phType?: PHType | string;
  phApprox?: string | null;
  summary?: string | null;
  mainUse?: string[];
  compatibleMaterialIds?: string[];
  contaminantIds?: string[];
  forbiddenMaterialIds?: string[];
  materialsRaw?: string[];
  contaminantsRaw?: string[];
  forbiddenRaw?: string[];
  standardDilution?: string | null;
  strongDilution?: string | null;
  dwellTime?: string | null;
  packSizes?: string[];
  warnings?: string[];
  confidence?: Confidence | string;
  status?: KnowledgeProduct["status"] | string;
  salesUrl?: string | null;
  salesLabel?: string | null;
};

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function upsertCatalogProduct(
  input: ProductUpsertInput,
  userId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const id = input.id?.trim().toLowerCase();
  if (!id || !ID_RE.test(id)) {
    return { ok: false, error: "제품 ID는 소문자·숫자·하이픈만 가능합니다. (예: brand-product)" };
  }
  const brand = input.brand?.trim();
  const name = input.name?.trim();
  if (!brand || !name) return { ok: false, error: "브랜드와 제품명은 필수입니다." };

  const source = listSourceProducts().find((p) => p.id === id);
  const origin: "source_override" | "admin" = source ? "source_override" : "admin";

  const supabase = createServiceSupabase();
  const { error } = await supabase.from("cleaning_products").upsert(
    {
      id,
      origin,
      brand,
      name,
      aliases: strArr(input.aliases),
      ph_type: asPhType(input.phType),
      ph_approx: input.phApprox?.trim() || null,
      summary: input.summary?.trim() || null,
      main_use: strArr(input.mainUse),
      compatible_material_ids: strArr(input.compatibleMaterialIds),
      contaminant_ids: strArr(input.contaminantIds),
      forbidden_material_ids: strArr(input.forbiddenMaterialIds),
      materials_raw: strArr(input.materialsRaw),
      contaminants_raw: strArr(input.contaminantsRaw),
      forbidden_raw: strArr(input.forbiddenRaw),
      standard_dilution: input.standardDilution?.trim() || null,
      strong_dilution: input.strongDilution?.trim() || null,
      dwell_time: input.dwellTime?.trim() || null,
      pack_sizes: strArr(input.packSizes),
      warnings: strArr(input.warnings),
      confidence: asConfidence(input.confidence),
      status: asStatus(input.status),
      deleted_at: null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) return { ok: false, error: error.message };

  const sales = await upsertProductSales(
    id,
    input.salesUrl ?? null,
    input.salesLabel ?? null,
    userId
  );
  if (!sales.ok) return sales;

  return { ok: true, id };
}

/** 소프트 삭제 — 문서 제품은 공개 목록에서 숨김, 관리자 제품도 동일 */
export async function softDeleteCatalogProduct(
  id: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = id.trim();
  if (!trimmed) return { ok: false, error: "제품 ID가 필요합니다." };

  const source = listSourceProducts().find((p) => p.id === trimmed);
  const supabase = createServiceSupabase();

  const { data: existing } = await supabase
    .from("cleaning_products")
    .select("id, brand, name, origin")
    .eq("id", trimmed)
    .maybeSingle();

  if (!existing && !source) {
    return { ok: false, error: "제품을 찾을 수 없습니다." };
  }

  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from("cleaning_products")
      .update({ deleted_at: now, updated_by: userId, updated_at: now })
      .eq("id", trimmed);
    if (error) return { ok: false, error: error.message };
  } else if (source) {
    const { error } = await supabase.from("cleaning_products").upsert(
      {
        id: trimmed,
        origin: "source_override",
        brand: source.brand,
        name: source.name,
        aliases: source.aliases ?? [],
        ph_type: source.phType,
        ph_approx: source.phApprox ?? null,
        summary: source.summary ?? null,
        main_use: source.mainUse ?? [],
        compatible_material_ids: source.compatibleMaterialIds ?? [],
        contaminant_ids: source.contaminantIds ?? [],
        forbidden_material_ids: source.forbiddenMaterialIds ?? [],
        materials_raw: source.materialsRaw ?? [],
        contaminants_raw: source.contaminantsRaw ?? [],
        forbidden_raw: source.forbiddenRaw ?? [],
        standard_dilution: source.standardDilution ?? null,
        strong_dilution: source.strongDilution ?? null,
        dwell_time: source.dwellTime ?? null,
        pack_sizes: source.packSizes ?? [],
        warnings: source.warnings ?? [],
        confidence: source.confidence,
        status: source.status ?? "active",
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

export async function restoreCatalogProduct(
  id: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceSupabase();
  const { error } = await supabase
    .from("cleaning_products")
    .update({ deleted_at: null, updated_by: userId, updated_at: new Date().toISOString() })
    .eq("id", id.trim());
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
