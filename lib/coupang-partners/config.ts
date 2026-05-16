import type { CoupangSlotConfig, CoupangSourceType } from "@/lib/coupang-partners/types";

export function parseCoupangSlotConfig(raw: unknown): CoupangSlotConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const source = o.source;
  if (!source || typeof source !== "object") return null;
  const s = source as Record<string, unknown>;
  const type = s.type as CoupangSourceType;
  if (type !== "search" && type !== "bestcategory" && type !== "goldbox") return null;

  const limitRaw = o.limit;
  const limit =
    typeof limitRaw === "number" && limitRaw >= 1 && limitRaw <= 5
      ? Math.floor(limitRaw)
      : 3;

  if (type === "search") {
    const keyword = typeof s.keyword === "string" ? s.keyword.trim() : "";
    if (!keyword) return null;
    return {
      source: { type, keyword },
      limit,
      subId: typeof o.subId === "string" ? o.subId.trim() || undefined : undefined,
      imageSize: typeof o.imageSize === "string" ? o.imageSize : "512x512",
    };
  }

  if (type === "bestcategory") {
    const categoryId = typeof s.categoryId === "number" ? s.categoryId : Number(s.categoryId);
    if (!Number.isFinite(categoryId) || categoryId <= 0) return null;
    return {
      source: { type, categoryId: Math.floor(categoryId) },
      limit,
      subId: typeof o.subId === "string" ? o.subId.trim() || undefined : undefined,
      imageSize: typeof o.imageSize === "string" ? o.imageSize : "512x512",
    };
  }

  return {
    source: { type: "goldbox" },
    limit,
    subId: typeof o.subId === "string" ? o.subId.trim() || undefined : undefined,
    imageSize: typeof o.imageSize === "string" ? o.imageSize : "512x512",
  };
}

export function defaultCoupangConfigForSlot(slotKey: string): CoupangSlotConfig {
  if (slotKey.includes("report")) {
    return { source: { type: "search", keyword: "청소용품" }, limit: 3, subId: slotKey };
  }
  if (slotKey.includes("award") || slotKey.includes("tender")) {
    return { source: { type: "bestcategory", categoryId: 1014 }, limit: 3, subId: slotKey };
  }
  return { source: { type: "goldbox" }, limit: 2, subId: slotKey };
}
