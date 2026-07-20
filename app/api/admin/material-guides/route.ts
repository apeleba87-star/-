import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  MATERIAL_GUIDES_CACHE_TAG,
  archiveMaterialGuide,
  upsertMaterialGuide,
} from "@/lib/knowledge-hub/materials/store";
import type { MaterialGuideRecord } from "@/lib/knowledge-hub/materials/types";
import { getMaterialById } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";

function asList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

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

function parseGuide(body: Record<string, unknown>): { ok: true; guide: MaterialGuideRecord } | { ok: false; error: string } {
  const materialId = typeof body.materialId === "string" ? body.materialId.trim() : "";
  if (!materialId) return { ok: false, error: "재질 ID는 필수입니다." };
  if (!getMaterialById(materialId)) return { ok: false, error: "알 수 없는 재질입니다." };
  const principle = typeof body.principle === "string" ? body.principle.trim() : "";
  if (!principle) return { ok: false, error: "한줄 원칙은 필수입니다." };
  const status =
    body.status === "published" ? "published" : body.status === "archived" ? "archived" : "draft";
  return {
    ok: true,
    guide: {
      materialId,
      principle,
      donts: asList(body.donts),
      okHints: asList(body.okHints),
      care: asList(body.care),
      status,
    },
  };
}

export async function PUT(req: Request) {
  try {
    const auth = await requireEditor();
    if ("error" in auth && auth.error) return auth.error;
    const { user } = auth as { user: { id: string } };

    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseGuide(body);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }
    const result = await upsertMaterialGuide(parsed.guide, user.id);
    if (!result.ok) return NextResponse.json(result, { status: 400 });

    revalidateTag(MATERIAL_GUIDES_CACHE_TAG, { expire: 0 });
    revalidatePath("/materials");
    revalidatePath(`/materials/${parsed.guide.materialId}`);

    return NextResponse.json({ ok: true, materialId: parsed.guide.materialId });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireEditor();
    if ("error" in auth && auth.error) return auth.error;
    const { user } = auth as { user: { id: string } };

    const body = (await req.json()) as Record<string, unknown>;
    const materialId = typeof body.materialId === "string" ? body.materialId.trim() : "";
    if (!materialId) {
      return NextResponse.json({ ok: false, error: "materialId가 필요합니다." }, { status: 400 });
    }

    const result = await archiveMaterialGuide(materialId, user.id);
    if (!result.ok) return NextResponse.json(result, { status: 400 });

    revalidateTag(MATERIAL_GUIDES_CACHE_TAG, { expire: 0 });
    revalidatePath("/materials");
    revalidatePath(`/materials/${materialId}`);

    return NextResponse.json({ ok: true, materialId });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 }
    );
  }
}
