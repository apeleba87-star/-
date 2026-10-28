import { NextRequest, NextResponse } from "next/server";
import {
  logProductSalesClick,
  resolveProductSalesDestination,
} from "@/lib/knowledge-hub/product-sales-clicks";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { id: rawId } = await ctx.params;
  const productId = decodeURIComponent(rawId || "").trim();
  const from = req.nextUrl.searchParams.get("from");

  if (!productId) {
    return NextResponse.redirect(new URL("/services", req.url), 302);
  }

  const destination = await resolveProductSalesDestination(productId);
  await logProductSalesClick({
    productId,
    destinationUrl: destination,
    source: from ?? "go_buy",
    req,
  });

  if (destination) {
    return NextResponse.redirect(destination, 302);
  }

  // 판매 링크 없으면 제품 상세로
  return NextResponse.redirect(new URL(`/products/${encodeURIComponent(productId)}`, req.url), 302);
}
