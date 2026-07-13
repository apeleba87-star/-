import { unstable_cache } from "next/cache";
import { createClient, createServiceSupabase } from "@/lib/supabase-server";

export type ProductSalesRow = {
  product_id: string;
  sales_url: string;
  sales_label: string | null;
};

export const PRODUCT_SALES_CACHE_TAG = "cleaning-product-sales";
const PRODUCT_SALES_REVALIDATE_SEC = 3600;

/** 스마트스토어 홈 — 제품별 링크 없을 때 fallback */
export function getSmartstoreHomeUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SMARTSTORE_HOME_URL?.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return null;
  return raw;
}

export type ProductPurchaseLink = {
  url: string;
  label: string;
  /** 제품 전용 링크면 true, 스토어 홈이면 false */
  isProductLink: boolean;
};

/**
 * 제품 전용 구매 링크만 반환.
 * 링크 없으면 null — UI는 「상품 준비중입니다」로 안내.
 */
export function resolveProductPurchase(product: {
  id: string;
  name: string;
  salesUrl?: string | null;
  salesLabel?: string | null;
}): ProductPurchaseLink | null {
  const productUrl = product.salesUrl?.trim();
  if (productUrl && /^https?:\/\//i.test(productUrl)) {
    return {
      url: productUrl,
      label: product.salesLabel?.trim() || `${product.name} 구매하기`,
      isProductLink: true,
    };
  }
  return null;
}

async function loadProductSalesMap(): Promise<Record<string, ProductSalesRow>> {
  try {
    // 공개 읽기 — RLS anon select 정책 사용 (service role 불필요)
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cleaning_product_sales")
      .select("product_id, sales_url, sales_label");
    if (error || !data) return {};
    const map: Record<string, ProductSalesRow> = {};
    for (const row of data) {
      if (!row.product_id || !row.sales_url) continue;
      map[row.product_id] = {
        product_id: row.product_id,
        sales_url: row.sales_url,
        sales_label: row.sales_label ?? null,
      };
    }
    return map;
  } catch {
    return {};
  }
}

/** 제품 ID → 판매 링크 맵 (실패 시 빈 맵 — 더미 URL 생성 안 함) */
export function getProductSalesMap(): Promise<Record<string, ProductSalesRow>> {
  return unstable_cache(loadProductSalesMap, ["cleaning-product-sales-map"], {
    revalidate: PRODUCT_SALES_REVALIDATE_SEC,
    tags: [PRODUCT_SALES_CACHE_TAG],
  })();
}

export async function upsertProductSales(
  productId: string,
  salesUrl: string | null,
  salesLabel: string | null,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceSupabase();

  if (!salesUrl || !salesUrl.trim()) {
    const { error } = await supabase.from("cleaning_product_sales").delete().eq("product_id", productId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const url = salesUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, error: "판매 링크는 http(s):// 로 시작해야 합니다." };
  }

  const { error } = await supabase.from("cleaning_product_sales").upsert(
    {
      product_id: productId,
      sales_url: url,
      sales_label: salesLabel?.trim() || null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function applySalesToProduct<T extends { id: string; salesUrl?: string | null; salesLabel?: string }>(
  product: T,
  salesMap: Record<string, ProductSalesRow>
): T {
  const row = salesMap[product.id];
  if (row) {
    return {
      ...product,
      salesUrl: row.sales_url,
      salesLabel: row.sales_label ?? product.salesLabel,
    };
  }
  // DB에 없을 때만 문서/합의된 기본 상품 URL
  const fallback = STATIC_PRODUCT_SALES[product.id];
  if (!fallback) return product;
  return {
    ...product,
    salesUrl: fallback.url,
    salesLabel: fallback.label ?? product.salesLabel,
  };
}

/** 관리자 미등록 시 사용하는 제품별 스마트스토어 URL */
const STATIC_PRODUCT_SALES: Record<string, { url: string; label?: string }> = {
  "kiehl-tornado": {
    url: "https://smartstore.naver.com/home_carry/products/7825156407",
    label: "토네이도 구매하기",
  },
};
