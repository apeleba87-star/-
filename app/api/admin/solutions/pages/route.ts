import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { getContaminantById } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import {
  SOLUTION_PAGES_CACHE_TAG,
  normalizeSolutionDetail,
  upsertSolutionPage,
} from "@/lib/knowledge-hub/solutions/solution-store";
import type { SolutionPage } from "@/lib/knowledge-hub/solutions/types";

export async function PUT(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
  }

  const body = (await req.json()) as Partial<SolutionPage> & {
    placeId: string;
    spaceId: string;
    partId: string;
    contaminantId: string;
    title: string;
  };

  if (!body.contaminantId || !getContaminantById(body.contaminantId)) {
    return NextResponse.json({ ok: false, error: "알 수 없는 오염 ID입니다." }, { status: 400 });
  }
  if (!body.placeId || !body.spaceId || !body.partId || !body.title?.trim()) {
    return NextResponse.json({ ok: false, error: "장소·공간·부위·제목은 필수입니다." }, { status: 400 });
  }

  const slug = (body.slug?.trim() || body.contaminantId).replace(/[^a-z0-9-_]/gi, "-");
  const id =
    body.id?.trim() || `${body.placeId}__${body.spaceId}__${body.partId}__${slug}`;

  const detail = normalizeSolutionDetail(body.detail);
  const productIdsFromDetail = detail?.recommendations
    ?.map((r) => r.productId)
    .filter((x): x is string => Boolean(x));

  const page: SolutionPage = {
    id,
    placeId: body.placeId as SolutionPage["placeId"],
    spaceId: body.spaceId as SolutionPage["spaceId"],
    partId: body.partId as SolutionPage["partId"],
    contaminantId: body.contaminantId,
    slug,
    materialId: body.materialId,
    title: body.title.trim(),
    description: body.description?.trim() || detail?.summary || undefined,
    placeContext: body.placeContext?.trim() || undefined,
    productIds: body.productIds?.length
      ? body.productIds
      : productIdsFromDetail?.length
        ? productIdsFromDetail
        : undefined,
    materialContaminantId: body.materialContaminantId,
    detail,
    status: body.status === "published" ? "published" : "draft",
  };

  const result = await upsertSolutionPage(page, user.id);
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  revalidateTag(SOLUTION_PAGES_CACHE_TAG, { expire: 0 });
  revalidatePath("/solutions");
  revalidatePath("/pollution");
  revalidatePath(`/solutions/${page.placeId}/${page.spaceId}/${page.partId}/${page.slug}`);

  return NextResponse.json({
    ok: true,
    id: page.id,
    path: `/solutions/${page.placeId}/${page.spaceId}/${page.partId}/${page.slug}`,
  });
}
