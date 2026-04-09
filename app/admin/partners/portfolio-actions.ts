"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { PARTNER_PORTFOLIO_BUCKET, PARTNER_PORTFOLIO_MAX_ITEMS } from "@/lib/partners/portfolio-constants";

function revalidatePartnerPaths(companyId: string) {
  revalidatePath("/partners");
  revalidatePath(`/partners/${companyId}`);
  revalidatePath("/partners/performance");
  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${companyId}/portfolio`);
  revalidatePath(`/admin/partners/${companyId}/edit`);
}

export async function addPartnerPortfolioByUrl(input: {
  company_id: string;
  image_url: string;
  title?: string;
  caption?: string | null;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const companyId = input.company_id?.trim();
  const imageUrl = input.image_url?.trim() ?? "";
  if (!companyId) return { ok: false, error: "업체 정보가 필요합니다." };
  if (!imageUrl) return { ok: false, error: "이미지 URL을 입력하세요." };

  try {
    const u = new URL(imageUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, error: "http 또는 https URL만 사용할 수 있습니다." };
  } catch {
    return { ok: false, error: "올바른 URL 형식이 아닙니다." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  const isStaff = role === "admin" || role === "editor";
  if (!isStaff) {
    const { data: own } = await supabase
      .from("partner_companies")
      .select("id")
      .eq("id", companyId)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (!own) return { ok: false, error: "권한이 없습니다." };
  }

  const { count, error: countError } = await supabase
    .from("partner_company_portfolio_items")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);
  if (countError) return { ok: false, error: countError.message };
  if ((count ?? 0) >= PARTNER_PORTFOLIO_MAX_ITEMS) {
    return { ok: false, error: `사진은 최대 ${PARTNER_PORTFOLIO_MAX_ITEMS}장까지 등록할 수 있습니다.` };
  }

  const { data: maxRow } = await supabase
    .from("partner_company_portfolio_items")
    .select("sort_order")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = ((maxRow as { sort_order?: number } | null)?.sort_order ?? 0) + 10;
  const itemId = randomUUID();

  const { error: insError } = await supabase.from("partner_company_portfolio_items").insert({
    id: itemId,
    company_id: companyId,
    title: input.title?.trim() || "작업 사례",
    caption: input.caption?.trim() || null,
    image_path_thumb: null,
    image_path_display: null,
    external_image_url: imageUrl,
    sort_order: nextSort,
  });

  if (insError) return { ok: false, error: insError.message };

  revalidatePartnerPaths(companyId);
  return { ok: true, id: itemId };
}

export async function updatePartnerPortfolioItem(input: {
  id: string;
  title: string;
  caption?: string | null;
  sort_order: number;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const id = input.id?.trim();
  if (!id) return { ok: false, error: "항목 ID가 필요합니다." };

  const title = input.title?.trim() ?? "";
  if (!title) return { ok: false, error: "제목을 입력하세요." };
  const sortOrder = Number(input.sort_order);
  if (!Number.isFinite(sortOrder)) return { ok: false, error: "정렬순서가 올바르지 않습니다." };

  const { data: row, error: fetchError } = await supabase
    .from("partner_company_portfolio_items")
    .select("id, company_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !row) return { ok: false, error: fetchError?.message ?? "항목을 찾을 수 없습니다." };

  const { error } = await supabase
    .from("partner_company_portfolio_items")
    .update({
      title,
      caption: input.caption?.trim() || null,
      sort_order: sortOrder,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePartnerPaths(row.company_id as string);
  return { ok: true };
}

export async function deletePartnerPortfolioItem(input: { id: string }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const id = input.id?.trim();
  if (!id) return { ok: false, error: "항목 ID가 필요합니다." };

  const { data: row, error: fetchError } = await supabase
    .from("partner_company_portfolio_items")
    .select("id, company_id, image_path_thumb, image_path_display, external_image_url")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !row) return { ok: false, error: fetchError?.message ?? "항목을 찾을 수 없습니다." };

  const companyId = row.company_id as string;
  const paths = [row.image_path_thumb, row.image_path_display].filter((p): p is string => Boolean(p?.trim()));

  const { error: delError } = await supabase.from("partner_company_portfolio_items").delete().eq("id", id);
  if (delError) return { ok: false, error: delError.message };

  if (paths.length > 0) {
    await supabase.storage.from(PARTNER_PORTFOLIO_BUCKET).remove(paths);
  }

  revalidatePartnerPaths(companyId);
  return { ok: true };
}
