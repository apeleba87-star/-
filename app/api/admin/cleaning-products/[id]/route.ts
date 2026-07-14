import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  PRODUCT_CATALOG_CACHE_TAG,
  restoreCatalogProduct,
  softDeleteCatalogProduct,
} from "@/lib/knowledge-hub/product-catalog";

type RouteCtx = { params: Promise<{ id: string }> };

async function requireEditor() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 }) };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { error: NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 }) };
  }
  return { user };
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const auth = await requireEditor();
  if ("error" in auth && auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await ctx.params;

  const result = await softDeleteCatalogProduct(id, user.id);
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  revalidateTag(PRODUCT_CATALOG_CACHE_TAG, { expire: 0 });
  revalidatePath(`/products/${id}`);
  revalidatePath("/products");
  revalidatePath("/admin/knowledge-hub");
  revalidatePath("/admin/solutions");

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, ctx: RouteCtx) {
  const auth = await requireEditor();
  if ("error" in auth && auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  if (body.action !== "restore") {
    return NextResponse.json({ ok: false, error: "지원하지 않는 작업입니다." }, { status: 400 });
  }

  const result = await restoreCatalogProduct(id, user.id);
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  revalidateTag(PRODUCT_CATALOG_CACHE_TAG, { expire: 0 });
  revalidatePath(`/products/${id}`);
  revalidatePath("/products");
  revalidatePath("/admin/knowledge-hub");
  revalidatePath("/admin/solutions");

  return NextResponse.json({ ok: true });
}
