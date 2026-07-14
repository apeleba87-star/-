import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { PRODUCT_SALES_CACHE_TAG, upsertProductSales } from "@/lib/knowledge-hub/product-sales";
import { getMergedProductById } from "@/lib/knowledge-hub/product-catalog";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!(await getMergedProductById(id))) {
    return NextResponse.json({ ok: false, error: "알 수 없는 제품 ID입니다." }, { status: 404 });
  }

  const body = (await req.json()) as { salesUrl?: string | null; salesLabel?: string | null };
  const result = await upsertProductSales(id, body.salesUrl ?? null, body.salesLabel ?? null, user.id);
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  revalidateTag(PRODUCT_SALES_CACHE_TAG, { expire: 0 });
  revalidatePath(`/products/${id}`);
  revalidatePath("/products");
  revalidatePath("/admin/knowledge-hub");
  revalidatePath("/cleaning");

  return NextResponse.json({ ok: true });
}
