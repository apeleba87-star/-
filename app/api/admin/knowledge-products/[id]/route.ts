import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { updateGuideProduct } from "@/lib/knowledge-hub/queries";

async function requireOperator() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다.", status: 401 };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, error: "권한이 없습니다.", status: 403 };
  }
  return { ok: true as const, userId: user.id };
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const auth = await requireOperator();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  const patch = (await req.json()) as Record<string, unknown>;

  const result = await updateGuideProduct(id, patch, auth.userId);
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  const service = createServiceSupabase();
  const { data: product } = await service
    .from("knowledge_products")
    .select("guide_id")
    .eq("id", id)
    .single();
  if (product?.guide_id) {
    const { data: guide } = await service.from("cleaning_guides").select("path").eq("id", product.guide_id).single();
    if (guide?.path) revalidatePath(guide.path);
  }

  return NextResponse.json({ ok: true });
}
