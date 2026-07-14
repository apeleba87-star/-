import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  PRODUCT_CATALOG_CACHE_TAG,
  upsertCatalogProduct,
  type ProductUpsertInput,
} from "@/lib/knowledge-hub/product-catalog";
import { PRODUCT_SALES_CACHE_TAG } from "@/lib/knowledge-hub/product-sales";

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

export async function PUT(req: Request) {
  const auth = await requireEditor();
  if ("error" in auth && auth.error) return auth.error;
  const user = auth.user!;

  const body = (await req.json()) as ProductUpsertInput;
  const result = await upsertCatalogProduct(body, user.id);
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  revalidateTag(PRODUCT_CATALOG_CACHE_TAG, { expire: 0 });
  revalidateTag(PRODUCT_SALES_CACHE_TAG, { expire: 0 });
  revalidatePath(`/products/${result.id}`);
  revalidatePath("/products");
  revalidatePath("/admin/knowledge-hub");
  revalidatePath("/admin/solutions");
  revalidatePath("/cleaning");
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ ok: true, id: result.id });
}
