import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  EQUIPMENT_CATALOG_CACHE_TAG,
  upsertEquipment,
  upsertEquipmentModel,
  type EquipmentModelUpsertInput,
  type EquipmentUpsertInput,
} from "@/lib/knowledge-hub/equipment/equipment-store";

async function requireEditor() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 }) };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { error: NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 }) };
  }
  return { user };
}

function revalidateEquipment(id?: string, equipmentId?: string) {
  revalidateTag(EQUIPMENT_CATALOG_CACHE_TAG, { expire: 0 });
  revalidatePath("/equipment");
  revalidatePath("/admin/equipment");
  revalidatePath("/sitemap.xml");
  if (id) revalidatePath(`/equipment/${id}`);
  if (equipmentId) {
    revalidatePath(`/equipment/${equipmentId}`);
    if (id) revalidatePath(`/equipment/${equipmentId}/models/${id}`);
  }
}

export async function PUT(req: Request) {
  const auth = await requireEditor();
  if ("error" in auth && auth.error) return auth.error;
  const user = auth.user!;

  const body = (await req.json()) as {
    kind?: "equipment" | "model";
  } & Partial<EquipmentUpsertInput & EquipmentModelUpsertInput>;

  if (body.kind === "model") {
    const result = await upsertEquipmentModel(body as EquipmentModelUpsertInput, user.id);
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    revalidateEquipment(result.id, (body as EquipmentModelUpsertInput).equipmentId);
    return NextResponse.json({ ok: true, id: result.id, kind: "model" });
  }

  const result = await upsertEquipment(body as EquipmentUpsertInput, user.id);
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  revalidateEquipment(result.id);
  return NextResponse.json({ ok: true, id: result.id, kind: "equipment" });
}
