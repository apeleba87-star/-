import { getCleaningKnowledgeDb } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";

export type EntityLink = {
  label: string;
  href: string;
  kind: "product" | "material" | "contaminant" | "recipe" | "guide";
};

/** 본문 자동 링크용 — 긴 이름부터 매칭(부분 오매칭 방지) */
export function buildEntityLinkRegistry(): EntityLink[] {
  const db = getCleaningKnowledgeDb();
  const links: EntityLink[] = [];

  for (const p of db.products) {
    links.push({ label: p.name, href: `/products/${p.id}`, kind: "product" });
    const en = p.name.match(/\(([^)]+)\)/)?.[1];
    if (en) links.push({ label: en, href: `/products/${p.id}`, kind: "product" });
  }
  for (const m of db.materials) {
    links.push({ label: m.name, href: `/materials/${m.id}`, kind: "material" });
    for (const a of m.aliases ?? []) {
      links.push({ label: a, href: `/materials/${m.id}`, kind: "material" });
    }
  }
  for (const c of db.contaminants) {
    links.push({ label: c.name, href: `/pollution/${c.id}`, kind: "contaminant" });
  }
  for (const r of db.recipes) {
    const product = db.products.find((p) => p.id === r.productId);
    if (product) {
      links.push({ label: `${product.name} 레시피`, href: `/cleaning/${r.slug}`, kind: "recipe" });
    }
    if (r.summary) {
      links.push({ label: r.summary, href: `/cleaning/${r.slug}`, kind: "recipe" });
    }
  }

  return links.sort((a, b) => b.label.length - a.label.length);
}

export function linkifyEntities(text: string): { text: string; links: { start: number; end: number; href: string }[] } {
  const registry = buildEntityLinkRegistry();
  const found: { start: number; end: number; href: string }[] = [];

  for (const entry of registry) {
    let from = 0;
    while (from < text.length) {
      const idx = text.indexOf(entry.label, from);
      if (idx === -1) break;
      const end = idx + entry.label.length;
      const overlaps = found.some((f) => !(end <= f.start || idx >= f.end));
      if (!overlaps) found.push({ start: idx, end, href: entry.href });
      from = idx + entry.label.length;
    }
  }

  found.sort((a, b) => a.start - b.start);
  return { text, links: found };
}
