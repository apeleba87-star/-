import type { EquipmentModelSpec } from "@/lib/knowledge-hub/equipment/types";

export function normalizeSpecs(v: unknown): EquipmentModelSpec[] {
  if (!Array.isArray(v)) return [];
  const out: EquipmentModelSpec[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const label = String((item as { label?: unknown }).label ?? "").trim();
    const value = String((item as { value?: unknown }).value ?? "").trim();
    if (!label || !value) continue;
    out.push({ label, value });
  }
  return out;
}

/** 관리자 입력: "라벨|값" 또는 "라벨: 값" 줄바꿈 */
export function parseSpecsText(text: string): EquipmentModelSpec[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const pipe = line.indexOf("|");
      if (pipe > 0) {
        return { label: line.slice(0, pipe).trim(), value: line.slice(pipe + 1).trim() };
      }
      const colon = line.indexOf(":");
      if (colon > 0) {
        return { label: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim() };
      }
      return null;
    })
    .filter((x): x is EquipmentModelSpec => Boolean(x?.label && x?.value));
}

export function specsToText(specs?: EquipmentModelSpec[]): string {
  return (specs ?? []).map((s) => `${s.label}|${s.value}`).join("\n");
}
