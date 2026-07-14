import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { getContaminantById } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import {
  SOLUTION_MASTERS_CACHE_TAG,
  upsertContaminantMaster,
} from "@/lib/knowledge-hub/solutions/solution-store";

export async function PATCH(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
  }

  const body = (await req.json()) as {
    contaminantId?: string;
    productIds?: string[];
    baseGuide?: string | null;
    warnings?: string[];
  };

  if (!body.contaminantId || !getContaminantById(body.contaminantId)) {
    return NextResponse.json({ ok: false, error: "알 수 없는 오염 ID입니다." }, { status: 400 });
  }

  const result = await upsertContaminantMaster(
    body.contaminantId,
    body.productIds ?? [],
    body.baseGuide ?? null,
    body.warnings ?? [],
    user.id
  );
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  revalidateTag(SOLUTION_MASTERS_CACHE_TAG, { expire: 0 });
  revalidatePath("/solutions");
  revalidatePath(`/pollution/${body.contaminantId}`);

  return NextResponse.json({ ok: true });
}
