import { createServiceSupabase } from "@/lib/supabase-server";

export type ProductSalesRow = {
  product_id: string;
  sales_url: string;
  sales_label: string | null;
};

/** 제품 ID → 판매 링크 맵 (실패 시 빈 맵 — 더미 URL 생성 안 함) */
export async function getProductSalesMap(): Promise<Record<string, ProductSalesRow>> {
  try {
    const supabase = createServiceSupabase();
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
  if (!row) return product;
  return {
    ...product,
    salesUrl: row.sales_url,
    salesLabel: row.sales_label ?? product.salesLabel,
  };
}
