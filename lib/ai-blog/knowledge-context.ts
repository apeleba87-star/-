import "server-only";
import { productHardForbidsMaterial } from "@/lib/knowledge-hub/cleaning-knowledge/build-from-source";
import { getCleaningKnowledgeDb } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import type { KnowledgeProduct } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";
import type { KnowledgeOptions, ProjectAttribute } from "@/lib/ai-blog/types";

const MAX_RECIPES = 4;
const MAX_FACTS = 4;
const MAX_LIST = 3;

export type KnowledgeConflict = { productId: string; productName: string; materialId: string; materialName: string };
export type KnowledgePreviewItem = { title: string; basis: string };

export type KnowledgeContext = {
  promptText: string;
  preview: KnowledgePreviewItem[];
  conflicts: KnowledgeConflict[];
};

function idsOf(attrs: ProjectAttribute[], type: ProjectAttribute["attr_type"]): string[] {
  return attrs.filter((a) => a.attr_type === type && a.ref_id).map((a) => a.ref_id as string);
}

function customOf(attrs: ProjectAttribute[], type: ProjectAttribute["attr_type"]): string[] {
  return attrs
    .filter((a) => a.attr_type === type && !a.ref_id && a.custom_label)
    .map((a) => (a.custom_label as string).trim())
    .filter(Boolean);
}

function productForbids(p: KnowledgeProduct, materialId: string): boolean {
  return Boolean(p.forbiddenMaterialIds?.includes(materialId)) || productHardForbidsMaterial(p.forbiddenRaw, materialId);
}

async function activeProducts(): Promise<KnowledgeProduct[]> {
  const all = await listMergedProducts();
  return all.filter((p) => p.status !== "discontinued" && p.status !== "draft");
}

export async function getKnowledgeOptions(): Promise<KnowledgeOptions> {
  const db = getCleaningKnowledgeDb();
  const products = await activeProducts();
  return {
    contaminants: db.contaminants.map((c) => ({ id: c.id, name: c.name })),
    materials: db.materials.map((m) => ({ id: m.id, name: m.name })),
    products: products
      .map((p) => ({ id: p.id, name: p.brand ? `${p.name} (${p.brand})` : p.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko")),
  };
}

/** 현장 속성으로 필요한 지식만 골라 AI 컨텍스트 텍스트와 화면 미리보기를 만든다 */
export async function buildKnowledgeContext(attrs: ProjectAttribute[]): Promise<KnowledgeContext> {
  const db = getCleaningKnowledgeDb();
  const products = await activeProducts();
  const productMap = new Map(products.map((p) => [p.id, p]));
  const materialName = (id: string) => db.materials.find((m) => m.id === id)?.name ?? id;
  const contaminantName = (id: string) => db.contaminants.find((c) => c.id === id)?.name ?? id;

  const mats = idsOf(attrs, "MATERIAL");
  const conts = idsOf(attrs, "CONTAMINANT");
  const prods = idsOf(attrs, "PRODUCT");

  const sections: string[] = [];
  const preview: KnowledgePreviewItem[] = [];
  const conflicts: KnowledgeConflict[] = [];

  for (const pid of prods) {
    const p = productMap.get(pid);
    if (!p) continue;
    const lines = [`제품: ${p.name}${p.brand ? ` (${p.brand})` : ""}`];
    if (p.summary) lines.push(`- 요약: ${p.summary}`);
    if (p.standardDilution) lines.push(`- 기본 희석: ${p.standardDilution}`);
    if (p.dwellTime) lines.push(`- 작용 시간: ${p.dwellTime}`);
    if (p.warnings.length) lines.push(`- 주의: ${p.warnings.slice(0, MAX_LIST).join(" / ")}`);
    const forbidden = mats.filter((m) => productForbids(p, m));
    for (const m of forbidden) {
      conflicts.push({ productId: p.id, productName: p.name, materialId: m, materialName: materialName(m) });
    }
    if (forbidden.length) {
      lines.push(`- 사용 금지 재질(이 재질에 사용했다고 쓰지 말 것): ${forbidden.map(materialName).join(", ")}`);
    }
    sections.push(lines.join("\n"));
    preview.push({ title: `${p.name} 사용법·주의사항`, basis: "선택한 제품" });
  }

  const recipes = db.recipes
    .filter((r) => mats.includes(r.materialId) && conts.includes(r.contaminantId))
    .sort((a, b) => Number(prods.includes(b.productId)) - Number(prods.includes(a.productId)))
    .slice(0, MAX_RECIPES);
  for (const r of recipes) {
    const lines = [`방법: ${r.seoTitle}`, `- 요약: ${r.summary}`];
    if (r.dilution) lines.push(`- 희석: ${r.dilution}`);
    if (r.dwellTime) lines.push(`- 작용 시간: ${r.dwellTime}`);
    if (r.steps.length) lines.push(`- 순서: ${r.steps.slice(0, 4).join(" → ")}`);
    if (r.warnings.length) lines.push(`- 주의: ${r.warnings.slice(0, 2).join(" / ")}`);
    sections.push(lines.join("\n"));
    preview.push({ title: r.seoTitle, basis: `${contaminantName(r.contaminantId)} × ${materialName(r.materialId)}` });
  }

  const facts = db.facts
    .filter(
      (f) =>
        (f.productId && prods.includes(f.productId)) ||
        (f.contaminantId && conts.includes(f.contaminantId) && (f.materialIds ?? []).some((m) => mats.includes(m))),
    )
    .sort((a, b) => Number(b.type === "caution") - Number(a.type === "caution"))
    .slice(0, MAX_FACTS);
  for (const f of facts) {
    sections.push(`사실: ${f.body}${f.warnings?.length ? `\n- 주의: ${f.warnings.slice(0, 2).join(" / ")}` : ""}`);
    preview.push({ title: f.body.length > 40 ? `${f.body.slice(0, 40)}…` : f.body, basis: "클린아이덱스 청소 지식" });
  }

  const critical = db.rules.filter((r) => r.severity === "critical").slice(0, 2);
  for (const r of critical) {
    sections.push(`원칙: ${r.title} — ${r.body}`);
  }

  const customProducts = customOf(attrs, "PRODUCT");
  if (customProducts.length) {
    sections.push(`기타 사용 제품(지식 DB 정보 없음 — 이름만 언급하고 효능·희석비는 쓰지 말 것): ${customProducts.join(", ")}`);
  }

  return {
    promptText: sections.length ? sections.join("\n\n") : "(관련 청소 지식 없음 — 일반적인 작업 순서만 쓰고 구체 수치는 쓰지 말 것)",
    preview,
    conflicts,
  };
}

export function attributeLabels(attrs: ProjectAttribute[], options: KnowledgeOptions) {
  const name = (list: { id: string; name: string }[], a: ProjectAttribute) =>
    a.ref_id ? (list.find((o) => o.id === a.ref_id)?.name ?? a.ref_id) : (a.custom_label ?? "");
  const pick = (type: ProjectAttribute["attr_type"], list: { id: string; name: string }[]) =>
    attrs.filter((a) => a.attr_type === type).map((a) => name(list, a)).filter(Boolean);
  return {
    contaminants: pick("CONTAMINANT", options.contaminants),
    materials: pick("MATERIAL", options.materials),
    products: pick("PRODUCT", options.products),
    spaces: attrs.filter((a) => a.attr_type === "SPACE").map((a) => a.custom_label ?? a.ref_id ?? ""),
  };
}
