import "server-only";
import { cleanText, nullableInt, nullableText } from "@/lib/ai-blog/server";
import type { AttrType, ProjectAttribute } from "@/lib/ai-blog/types";

const ATTR_TYPES = new Set<AttrType>(["CONTAMINANT", "MATERIAL", "PRODUCT", "SPACE"]);

export function parseProjectFields(body: Record<string, unknown>) {
  const area = typeof body.area_pyeong === "number" ? body.area_pyeong : Number(body.area_pyeong);
  const workDate = cleanText(body.work_date, 10);
  return {
    service_type: cleanText(body.service_type, 50),
    region_sido: nullableText(body.region_sido, 30),
    region_sigungu: nullableText(body.region_sigungu, 30),
    region_dong: nullableText(body.region_dong, 30),
    property_type: nullableText(body.property_type, 30),
    area_pyeong: Number.isFinite(area) && area > 0 ? Math.min(Math.round(area * 10) / 10, 99999) : null,
    worker_count: nullableInt(body.worker_count, 0, 100),
    work_minutes: nullableInt(body.work_minutes, 0, 60 * 24 * 7),
    price: nullableInt(body.price, 0, 1_000_000_000),
    work_date: /^\d{4}-\d{2}-\d{2}$/.test(workDate) ? workDate : null,
    description: nullableText(body.description, 2000),
  };
}

export function parseAttributes(v: unknown): ProjectAttribute[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: ProjectAttribute[] = [];
  for (const raw of v.slice(0, 60)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const type = cleanText(r.attr_type, 20) as AttrType;
    if (!ATTR_TYPES.has(type)) continue;
    const refId = nullableText(r.ref_id, 100);
    const custom = refId ? null : nullableText(r.custom_label, 50);
    if (!refId && !custom) continue;
    const key = `${type}:${refId ?? ""}:${custom ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ attr_type: type, ref_id: refId, custom_label: custom });
  }
  return out;
}
