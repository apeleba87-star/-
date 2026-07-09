import type { CleaningKnowledgeDb, IngestResult } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import {
  factDedupeKey,
  indexDb,
  mergeSources,
  productDedupeKey,
  qaDedupeKey,
  recipeDedupeKey,
  ruleDedupeKey,
} from "@/lib/knowledge-hub/cleaning-knowledge/dedupe";

function mergeById<T extends { id: string }>(base: T[], incoming: T[]): T[] {
  const map = new Map(base.map((x) => [x.id, x]));
  for (const item of incoming) {
    map.set(item.id, item);
  }
  return [...map.values()];
}

export function mergeKnowledgeDb(base: CleaningKnowledgeDb, patch: Partial<CleaningKnowledgeDb>): IngestResult {
  const result: IngestResult = {
    added: { products: 0, facts: 0, recipes: 0, qaCases: 0, rules: 0 },
    merged: { products: 0, facts: 0, recipes: 0, qaCases: 0, rules: 0 },
    skipped: 0,
  };

  const db: CleaningKnowledgeDb = {
    ...base,
    materials: mergeById(base.materials, patch.materials ?? []),
    contaminants: mergeById(base.contaminants, patch.contaminants ?? []),
    products: [...base.products],
    facts: [...base.facts],
    recipes: [...base.recipes],
    qaCases: [...base.qaCases],
    rules: [...base.rules],
    version: (patch.version ?? base.version) + (patch.materials?.length || patch.facts?.length ? 0 : 0),
    updatedAt: new Date().toISOString(),
  };

  const idx = indexDb(db);

  for (const p of patch.products ?? []) {
    const key = productDedupeKey(p);
    const existing = idx.products.get(key);
    if (existing) {
      const merged = mergeSources(existing, p);
      Object.assign(existing, merged);
      result.merged.products++;
    } else {
      db.products.push(p);
      idx.products.set(key, p);
      result.added.products++;
    }
  }

  for (const f of patch.facts ?? []) {
    const key = factDedupeKey(f);
    const existing = idx.facts.get(key);
    if (existing) {
      const merged = mergeSources(existing, f);
      Object.assign(existing, merged);
      result.merged.facts++;
    } else {
      db.facts.push(f);
      idx.facts.set(key, f);
      result.added.facts++;
    }
  }

  for (const r of patch.recipes ?? []) {
    const key = recipeDedupeKey(r);
    const existing = idx.recipes.get(key);
    if (existing) {
      const merged = mergeSources(existing, r);
      Object.assign(existing, { ...r, sources: merged.sources });
      result.merged.recipes++;
    } else {
      db.recipes.push(r);
      idx.recipes.set(key, r);
      result.added.recipes++;
    }
  }

  for (const q of patch.qaCases ?? []) {
    const key = qaDedupeKey(q);
    const existing = idx.qa.get(key);
    if (existing) {
      const merged = mergeSources(existing, q);
      Object.assign(existing, merged);
      result.merged.qaCases++;
    } else {
      db.qaCases.push(q);
      idx.qa.set(key, q);
      result.added.qaCases++;
    }
  }

  for (const rule of patch.rules ?? []) {
    const key = ruleDedupeKey(rule);
    const existing = idx.rules.get(key);
    if (existing) {
      const merged = mergeSources(existing, rule);
      Object.assign(existing, merged);
      result.merged.rules++;
    } else {
      db.rules.push(rule);
      idx.rules.set(key, rule);
      result.added.rules++;
    }
  }

  db.version = base.version + 1;
  return result;
}
