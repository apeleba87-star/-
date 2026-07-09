import type {
  CleaningKnowledgeDb,
  KnowledgeFact,
  KnowledgeProduct,
  KnowledgeQaCase,
  KnowledgeRecipe,
  KnowledgeRule,
} from "@/lib/knowledge-hub/cleaning-knowledge/types";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function factDedupeKey(f: Pick<KnowledgeFact, "type" | "productId" | "materialIds" | "contaminantId" | "dilution" | "body">): string {
  const mats = [...(f.materialIds ?? [])].sort().join(",");
  return [f.type, f.productId ?? "", mats, f.contaminantId ?? "", norm(f.dilution ?? ""), norm(f.body).slice(0, 120)].join("|");
}

export function productDedupeKey(p: Pick<KnowledgeProduct, "id" | "brand" | "name">): string {
  return p.id || `${norm(p.brand)}:${norm(p.name)}`;
}

export function recipeDedupeKey(r: Pick<KnowledgeRecipe, "slug" | "productId" | "materialId" | "contaminantId">): string {
  return r.slug || `${r.productId}:${r.materialId}:${r.contaminantId}`;
}

export function qaDedupeKey(q: Pick<KnowledgeQaCase, "id" | "question">): string {
  return q.id || norm(q.question).slice(0, 80);
}

export function ruleDedupeKey(r: Pick<KnowledgeRule, "id" | "title">): string {
  return r.id || norm(r.title);
}

export function mergeSources<T extends { sources?: { title: string }[] }>(
  existing: T,
  incoming: T
): T {
  const seen = new Set((existing.sources ?? []).map((s) => s.title));
  const merged = [...(existing.sources ?? [])];
  for (const s of incoming.sources ?? []) {
    if (!seen.has(s.title)) {
      seen.add(s.title);
      merged.push(s);
    }
  }
  return { ...existing, ...incoming, sources: merged };
}

export function indexDb(db: CleaningKnowledgeDb) {
  return {
    products: new Map(db.products.map((p) => [productDedupeKey(p), p])),
    facts: new Map(db.facts.map((f) => [factDedupeKey(f), f])),
    recipes: new Map(db.recipes.map((r) => [recipeDedupeKey(r), r])),
    qa: new Map(db.qaCases.map((q) => [qaDedupeKey(q), q])),
    rules: new Map(db.rules.map((r) => [ruleDedupeKey(r), r])),
  };
}
