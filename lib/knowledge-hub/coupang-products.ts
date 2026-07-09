import { fetchCoupangProductsForConfig } from "@/lib/coupang-partners/client";
import type { CoupangBannerProduct } from "@/lib/coupang-partners/types";

export async function fetchCoupangByKeyword(keyword: string): Promise<CoupangBannerProduct[]> {
  try {
    return await fetchCoupangProductsForConfig(
      { source: { type: "search", keyword }, limit: 1 },
      `guide-${keyword}`
    );
  } catch {
    return [];
  }
}
