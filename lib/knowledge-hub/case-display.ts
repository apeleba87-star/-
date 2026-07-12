import type { EvidenceLevel, KnowledgeCaseEvidence } from "@/lib/knowledge-hub/cleaning-knowledge/types";

/** 노이즈성 결과 문구 — 카드에서는 숨김 */
const WEAK_RESULTS = /^(세정\s*사례\s*소개|사례\s*소개|미확인|없음|-)$/i;

export function casePlaceLabel(c: KnowledgeCaseEvidence): string {
  const area = c.area?.trim();
  if (area) return area.length > 36 ? `${area.slice(0, 36)}…` : area;
  const facility = c.facility?.trim();
  if (facility) return facility;
  return c.categoryMajor || "현장";
}

export function caseHeadline(c: KnowledgeCaseEvidence): string {
  const mat = c.materialRaw?.trim();
  const cont = c.contaminantRaw?.trim();
  if (mat && cont) {
    const line = `${shortChip(mat, 22)} · ${shortChip(cont, 22)}`;
    return line.length > 52 ? `${line.slice(0, 52)}…` : line;
  }
  if (mat) return shortChip(mat, 36);
  if (cont) return shortChip(cont, 36);
  return casePlaceLabel(c);
}

/** 상세 페이지용 — 잘림 없이 재질 · 오염 */
export function caseHeadlineFull(c: KnowledgeCaseEvidence): string {
  const mat = c.materialRaw?.trim();
  const cont = c.contaminantRaw?.trim();
  if (mat && cont) return `${mat} · ${cont}`;
  if (mat) return mat;
  if (cont) return cont;
  if (c.name?.trim()) return c.name.trim();
  return casePlaceLabel(c);
}

export function caseResultLabel(c: KnowledgeCaseEvidence): string | null {
  const r = c.result?.trim();
  if (!r || WEAK_RESULTS.test(r)) return null;
  return r.length > 48 ? `${r.slice(0, 48)}…` : r;
}

/** 상세 페이지용 — 결과 전문 */
export function caseResultFull(c: KnowledgeCaseEvidence): string | null {
  const r = c.result?.trim();
  if (!r || WEAK_RESULTS.test(r)) return null;
  return r;
}

export function evidenceLevelLabel(level: EvidenceLevel): string {
  if (level === "field_case") return "현장";
  if (level === "product_spec") return "제품";
  if (level === "principle") return "원칙";
  return "초안";
}

function shortChip(s: string, max = 16): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export function caseMatchesQuery(c: KnowledgeCaseEvidence, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase().replace(/\s+/g, "");
  const hay = [
    c.name,
    c.categoryMajor,
    c.categoryMid,
    c.categoryMinor,
    c.facility,
    c.area,
    c.materialRaw,
    c.contaminantRaw,
    c.dilution,
    ...(c.productNames ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, "");
  return hay.includes(needle);
}
