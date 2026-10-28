import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/lib/knowledge-hub/queries";
import { fetchCoupangByKeyword } from "@/lib/knowledge-hub/coupang-products";
import {
  logProductSalesClick,
  resolveProductSalesDestination,
} from "@/lib/knowledge-hub/product-sales-clicks";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const from = req.nextUrl.searchParams.get("from") ?? "go_p";
  const product = await getProductById(id);
  if (!product) {
    return NextResponse.redirect(new URL("/services", req.url), 302);
  }

  // 등록된 구매 링크가 있으면 그걸 우선 (클릭 집계 포함)
  const salesDest = await resolveProductSalesDestination(id);
  if (salesDest) {
    await logProductSalesClick({
      productId: id,
      destinationUrl: salesDest,
      source: from,
      req,
    });
    return NextResponse.redirect(salesDest, 302);
  }

  let destination: string | null = null;
  if (product.source_type === "smartstore" && product.source_url) {
    destination = product.source_url;
  } else if (product.source_url) {
    destination = product.source_url;
  } else if (product.coupang_keyword) {
    const items = await fetchCoupangByKeyword(product.coupang_keyword);
    if (items[0]?.productUrl) {
      destination = items[0].productUrl;
    } else {
      destination = `https://www.coupang.com/np/search?q=${encodeURIComponent(product.coupang_keyword)}`;
    }
  }

  if (destination) {
    await logProductSalesClick({
      productId: id,
      destinationUrl: destination,
      source: from,
      req,
    });
    return NextResponse.redirect(destination, 302);
  }

  return NextResponse.redirect(new URL("/services", req.url), 302);
}
