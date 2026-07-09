import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/lib/knowledge-hub/queries";
import { fetchCoupangByKeyword } from "@/lib/knowledge-hub/coupang-products";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const product = await getProductById(id);
  if (!product) {
    return NextResponse.redirect(new URL("/services", req.url), 302);
  }

  if (product.source_type === "smartstore" && product.source_url) {
    return NextResponse.redirect(product.source_url, 302);
  }
  if (product.source_url) {
    return NextResponse.redirect(product.source_url, 302);
  }
  if (product.coupang_keyword) {
    const items = await fetchCoupangByKeyword(product.coupang_keyword);
    if (items[0]?.productUrl) {
      return NextResponse.redirect(items[0].productUrl, 302);
    }
    return NextResponse.redirect(
      `https://www.coupang.com/np/search?q=${encodeURIComponent(product.coupang_keyword)}`,
      302
    );
  }

  return NextResponse.redirect(new URL("/services", req.url), 302);
}
