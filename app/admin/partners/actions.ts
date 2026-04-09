"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { notifyPartnerChangeRequestResult } from "@/lib/partners/change-request-notifications";

type PriceInput = {
  item_name: string;
  unit?: string | null;
  base_price: number;
  note?: string | null;
};

type RequestedPrice = {
  item_name: string;
  unit?: string | null;
  base_price: number;
  note?: string | null;
};

type RequestPayload = {
  main_image_url?: string | null;
  prices?: RequestedPrice[];
};

export type CreatePartnerCompanyInput = {
  name: string;
  contact_name: string;
  phone: string;
  one_liner?: string | null;
  work_scope?: string | null;
  business_verified?: boolean;
  homepage_url?: string | null;
  sns_url?: string | null;
  main_image_url?: string | null;
  status?: "draft" | "pending" | "active" | "paused" | "archived";
  owner_user_id?: string | null;
  category_codes: string[];
  region_codes: string[];
  prices: PriceInput[];
};

export type UpsertPartnerCategoryInput = {
  code: string;
  label: string;
  sort_order?: number;
  is_active?: boolean;
};

export type UpdatePartnerCategoryInput = {
  code: string;
  sort_order?: number;
  is_active?: boolean;
};

export type UpsertPartnerRegionInput = {
  code: string;
  label: string;
  parent_code?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export type UpdatePartnerRegionInput = {
  code: string;
  label?: string;
  parent_code?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

function normalizeMasterCode(raw: string): string {
  return raw.trim().toLowerCase();
}

function isValidMasterCode(code: string): boolean {
  return /^[a-z0-9_]{2,40}$/.test(code);
}

async function writeMasterAuditLog(params: {
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
  actorUserId: string;
  entityType: "category" | "region";
  entityCode: string;
  actionType: "create" | "update" | "toggle_active" | "sort_change";
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
}) {
  try {
    await params.supabase
      .from("partner_master_change_logs")
      .insert({
        actor_user_id: params.actorUserId,
        entity_type: params.entityType,
        entity_code: params.entityCode,
        action_type: params.actionType,
        before_data: params.beforeData,
        after_data: params.afterData,
      });
  } catch {
    // 로깅 실패가 본 처리 실패로 번지지 않도록 보호
  }
}

export async function createPartnerCompany(input: CreatePartnerCompanyInput) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") return { ok: false, error: "권한이 없습니다." };

  if (!input.name?.trim()) return { ok: false, error: "업체명을 입력하세요." };
  if (!input.contact_name?.trim()) return { ok: false, error: "대표자명을 입력하세요." };
  if (!input.phone?.trim()) return { ok: false, error: "연락처를 입력하세요." };

  const { data: company, error: companyError } = await supabase
    .from("partner_companies")
    .insert({
      name: input.name.trim(),
      contact_name: input.contact_name.trim(),
      phone: input.phone.trim(),
      one_liner: input.one_liner?.trim() || null,
      work_scope: input.work_scope?.trim() || null,
      business_verified: Boolean(input.business_verified),
      homepage_url: input.homepage_url?.trim() || null,
      sns_url: input.sns_url?.trim() || null,
      main_image_url: input.main_image_url?.trim() || null,
      status: input.status ?? "active",
      owner_user_id: input.owner_user_id?.trim() || null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (companyError || !company) return { ok: false, error: companyError?.message ?? "업체 생성 실패" };

  const companyId = company.id as string;
  const categoryCodes = Array.from(new Set(input.category_codes.map((x) => x.trim()).filter(Boolean)));
  const regionCodes = Array.from(new Set(input.region_codes.map((x) => x.trim()).filter(Boolean)));
  const prices = input.prices
    .map((p, idx) => ({
      item_name: p.item_name?.trim() ?? "",
      unit: p.unit?.trim() || null,
      base_price: Number(p.base_price),
      note: p.note?.trim() || null,
      sort_order: (idx + 1) * 10,
    }))
    .filter((p) => p.item_name && Number.isFinite(p.base_price) && p.base_price >= 0);

  if (categoryCodes.length > 0) {
    const { error } = await supabase.from("partner_company_categories").insert(
      categoryCodes.map((code) => ({ company_id: companyId, category_code: code }))
    );
    if (error) return { ok: false, error: error.message };
  }
  if (regionCodes.length > 0) {
    const { error } = await supabase.from("partner_company_regions").insert(
      regionCodes.map((code) => ({ company_id: companyId, region_code: code }))
    );
    if (error) return { ok: false, error: error.message };
  }
  if (prices.length > 0) {
    const { error } = await supabase.from("partner_company_prices").insert(
      prices.map((p) => ({ company_id: companyId, ...p }))
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/partners");
  revalidatePath(`/partners/${companyId}`);
  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${companyId}/edit`);
  return { ok: true, id: companyId };
}

export type UpdatePartnerCompanyInput = CreatePartnerCompanyInput & { id: string };

export async function updatePartnerCompany(input: UpdatePartnerCompanyInput) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") return { ok: false, error: "권한이 없습니다." };

  const companyId = input.id?.trim();
  if (!companyId) return { ok: false, error: "업체 ID가 필요합니다." };
  if (!input.name?.trim()) return { ok: false, error: "업체명을 입력하세요." };
  if (!input.contact_name?.trim()) return { ok: false, error: "대표자명을 입력하세요." };
  if (!input.phone?.trim()) return { ok: false, error: "연락처를 입력하세요." };

  const { data: existing } = await supabase.from("partner_companies").select("id").eq("id", companyId).maybeSingle();
  if (!existing) return { ok: false, error: "업체를 찾을 수 없습니다." };

  const ownerRaw = input.owner_user_id?.trim();
  const owner_user_id = ownerRaw && /^[0-9a-f-]{36}$/i.test(ownerRaw) ? ownerRaw : null;

  const { error: companyError } = await supabase
    .from("partner_companies")
    .update({
      name: input.name.trim(),
      contact_name: input.contact_name.trim(),
      phone: input.phone.trim(),
      one_liner: input.one_liner?.trim() || null,
      work_scope: input.work_scope?.trim() || null,
      business_verified: Boolean(input.business_verified),
      homepage_url: input.homepage_url?.trim() || null,
      sns_url: input.sns_url?.trim() || null,
      main_image_url: input.main_image_url?.trim() || null,
      status: input.status ?? "active",
      owner_user_id,
      updated_by: user.id,
    })
    .eq("id", companyId);

  if (companyError) return { ok: false, error: companyError.message };

  const categoryCodes = Array.from(new Set(input.category_codes.map((x) => x.trim()).filter(Boolean)));
  const regionCodes = Array.from(new Set(input.region_codes.map((x) => x.trim()).filter(Boolean)));
  const prices = input.prices
    .map((p, idx) => ({
      item_name: p.item_name?.trim() ?? "",
      unit: p.unit?.trim() || null,
      base_price: Number(p.base_price),
      note: p.note?.trim() || null,
      sort_order: (idx + 1) * 10,
    }))
    .filter((p) => p.item_name && Number.isFinite(p.base_price) && p.base_price >= 0);

  const { error: delCat } = await supabase.from("partner_company_categories").delete().eq("company_id", companyId);
  if (delCat) return { ok: false, error: delCat.message };
  const { error: delReg } = await supabase.from("partner_company_regions").delete().eq("company_id", companyId);
  if (delReg) return { ok: false, error: delReg.message };
  const { error: delPrice } = await supabase.from("partner_company_prices").delete().eq("company_id", companyId);
  if (delPrice) return { ok: false, error: delPrice.message };

  if (categoryCodes.length > 0) {
    const { error } = await supabase.from("partner_company_categories").insert(
      categoryCodes.map((code) => ({ company_id: companyId, category_code: code }))
    );
    if (error) return { ok: false, error: error.message };
  }
  if (regionCodes.length > 0) {
    const { error } = await supabase.from("partner_company_regions").insert(
      regionCodes.map((code) => ({ company_id: companyId, region_code: code }))
    );
    if (error) return { ok: false, error: error.message };
  }
  if (prices.length > 0) {
    const { error } = await supabase.from("partner_company_prices").insert(
      prices.map((p) => ({ company_id: companyId, ...p }))
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/partners");
  revalidatePath(`/partners/${companyId}`);
  revalidatePath("/partners/performance");
  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${companyId}/edit`);
  revalidatePath(`/admin/partners/${companyId}/portfolio`);
  return { ok: true };
}

async function assertAdminOrEditor() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null, error: "로그인이 필요합니다." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") return { supabase, user: null as null, error: "권한이 없습니다." };
  return { supabase, user, error: null as string | null };
}

export async function approvePartnerChangeRequest(input: { request_id: string }) {
  const auth = await assertAdminOrEditor();
  if (auth.error || !auth.user) return { ok: false, error: auth.error ?? "권한 확인 실패" };
  const { supabase, user } = auth;

  const requestId = input.request_id?.trim();
  if (!requestId) return { ok: false, error: "request_id가 필요합니다." };

  const { data: request, error: reqError } = await supabase
    .from("partner_company_change_requests")
    .select("id, company_id, status, payload")
    .eq("id", requestId)
    .maybeSingle();
  if (reqError || !request) return { ok: false, error: reqError?.message ?? "요청을 찾을 수 없습니다." };
  if (request.status !== "pending") return { ok: false, error: "이미 처리된 요청입니다." };

  const payload = (request.payload ?? {}) as RequestPayload;
  const mainImageUrl = payload.main_image_url?.trim() || null;
  const prices = (payload.prices ?? [])
    .map((p, idx) => ({
      item_name: p.item_name?.trim() ?? "",
      unit: p.unit?.trim() || null,
      base_price: Number(p.base_price),
      note: p.note?.trim() || null,
      sort_order: (idx + 1) * 10,
    }))
    .filter((p) => p.item_name && Number.isFinite(p.base_price) && p.base_price >= 0);

  const { error: companyError } = await supabase
    .from("partner_companies")
    .update({ main_image_url: mainImageUrl, updated_by: user.id })
    .eq("id", request.company_id);
  if (companyError) return { ok: false, error: companyError.message };

  if (prices.length > 0) {
    const { error: delError } = await supabase
      .from("partner_company_prices")
      .delete()
      .eq("company_id", request.company_id);
    if (delError) return { ok: false, error: delError.message };

    const { error: insError } = await supabase
      .from("partner_company_prices")
      .insert(prices.map((p) => ({ company_id: request.company_id, ...p })));
    if (insError) return { ok: false, error: insError.message };
  }

  const { error: updateReqError } = await supabase
    .from("partner_company_change_requests")
    .update({
      status: "approved",
      reviewer_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      reject_reason: null,
    })
    .eq("id", requestId);
  if (updateReqError) return { ok: false, error: updateReqError.message };

  const { data: company } = await supabase
    .from("partner_companies")
    .select("id, name, owner_user_id")
    .eq("id", request.company_id)
    .maybeSingle();
  if (company?.owner_user_id) {
    await notifyPartnerChangeRequestResult({
      ownerUserId: company.owner_user_id,
      companyId: company.id,
      companyName: company.name ?? "협력업체",
      status: "approved",
    });
  }

  revalidatePath("/partners");
  revalidatePath(`/partners/${request.company_id}`);
  revalidatePath("/partners/performance");
  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${request.company_id}/edit`);
  return { ok: true };
}

export async function rejectPartnerChangeRequest(input: { request_id: string; reason?: string | null }) {
  const auth = await assertAdminOrEditor();
  if (auth.error || !auth.user) return { ok: false, error: auth.error ?? "권한 확인 실패" };
  const { supabase, user } = auth;

  const requestId = input.request_id?.trim();
  if (!requestId) return { ok: false, error: "request_id가 필요합니다." };

  const { data: request, error: reqError } = await supabase
    .from("partner_company_change_requests")
    .select("id, company_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (reqError || !request) return { ok: false, error: reqError?.message ?? "요청을 찾을 수 없습니다." };
  if (request.status !== "pending") return { ok: false, error: "이미 처리된 요청입니다." };

  const { error: updateReqError } = await supabase
    .from("partner_company_change_requests")
    .update({
      status: "rejected",
      reviewer_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      reject_reason: input.reason?.trim() || "요청이 반려되었습니다.",
    })
    .eq("id", requestId);
  if (updateReqError) return { ok: false, error: updateReqError.message };

  const { data: company } = await supabase
    .from("partner_companies")
    .select("id, name, owner_user_id")
    .eq("id", request.company_id)
    .maybeSingle();
  if (company?.owner_user_id) {
    await notifyPartnerChangeRequestResult({
      ownerUserId: company.owner_user_id,
      companyId: company.id,
      companyName: company.name ?? "협력업체",
      status: "rejected",
      rejectReason: input.reason ?? null,
    });
  }

  revalidatePath("/partners/performance");
  revalidatePath("/admin/partners");
  return { ok: true };
}

export async function upsertPartnerCategory(input: UpsertPartnerCategoryInput) {
  const auth = await assertAdminOrEditor();
  if (auth.error || !auth.user) return { ok: false, error: auth.error ?? "권한이 없습니다." };
  const { supabase, user } = auth;

  const code = normalizeMasterCode(input.code);
  const label = input.label.trim();
  if (!code) return { ok: false, error: "코드를 입력하세요." };
  if (!isValidMasterCode(code)) return { ok: false, error: "코드는 소문자/숫자/언더스코어 2~40자만 가능합니다." };
  if (!label) return { ok: false, error: "업종명을 입력하세요." };
  const sortOrder = Number.isFinite(Number(input.sort_order)) ? Number(input.sort_order) : 100;

  const { data: before } = await supabase
    .from("partner_categories")
    .select("code, label, sort_order, is_active")
    .eq("code", code)
    .maybeSingle();

  const { error } = await supabase.from("partner_categories").upsert({
    code,
    label,
    sort_order: sortOrder,
    is_active: input.is_active ?? true,
  });
  if (error) return { ok: false, error: error.message };

  await writeMasterAuditLog({
    supabase,
    actorUserId: user.id,
    entityType: "category",
    entityCode: code,
    actionType: before ? "update" : "create",
    beforeData: (before as Record<string, unknown> | null) ?? null,
    afterData: { code, label, sort_order: sortOrder, is_active: input.is_active ?? true },
  });

  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  return { ok: true };
}

export async function updatePartnerCategory(input: UpdatePartnerCategoryInput) {
  const auth = await assertAdminOrEditor();
  if (auth.error || !auth.user) return { ok: false, error: auth.error ?? "권한이 없습니다." };
  const { supabase, user } = auth;

  const code = normalizeMasterCode(input.code);
  if (!code) return { ok: false, error: "코드가 필요합니다." };
  if (!isValidMasterCode(code)) return { ok: false, error: "코드 형식이 올바르지 않습니다." };

  const { data: before } = await supabase
    .from("partner_categories")
    .select("code, label, sort_order, is_active")
    .eq("code", code)
    .maybeSingle();
  if (!before) return { ok: false, error: "대상 업종을 찾을 수 없습니다." };

  const patch: { sort_order?: number; is_active?: boolean } = {};
  if (input.sort_order != null && Number.isFinite(Number(input.sort_order))) patch.sort_order = Number(input.sort_order);
  if (input.is_active != null) patch.is_active = input.is_active;

  const { error } = await supabase.from("partner_categories").update(patch).eq("code", code);
  if (error) return { ok: false, error: error.message };

  await writeMasterAuditLog({
    supabase,
    actorUserId: user.id,
    entityType: "category",
    entityCode: code,
    actionType: patch.is_active != null ? "toggle_active" : patch.sort_order != null ? "sort_change" : "update",
    beforeData: before as Record<string, unknown>,
    afterData: { ...(before as Record<string, unknown>), ...patch },
  });

  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  return { ok: true };
}

export async function upsertPartnerRegion(input: UpsertPartnerRegionInput) {
  const auth = await assertAdminOrEditor();
  if (auth.error || !auth.user) return { ok: false, error: auth.error ?? "권한이 없습니다." };
  const { supabase, user } = auth;

  const code = normalizeMasterCode(input.code);
  const label = input.label.trim();
  const parentCode = input.parent_code ? normalizeMasterCode(input.parent_code) : null;
  if (!code) return { ok: false, error: "코드를 입력하세요." };
  if (!isValidMasterCode(code)) return { ok: false, error: "코드는 소문자/숫자/언더스코어 2~40자만 가능합니다." };
  if (!label) return { ok: false, error: "지역명을 입력하세요." };
  if (parentCode && !isValidMasterCode(parentCode)) return { ok: false, error: "parent_code 형식이 올바르지 않습니다." };
  if (parentCode && parentCode === code) return { ok: false, error: "parent_code는 자기 자신일 수 없습니다." };
  if (parentCode) {
    const { data: parent } = await supabase.from("partner_regions").select("code").eq("code", parentCode).maybeSingle();
    if (!parent) return { ok: false, error: "parent_code 대상 지역이 없습니다." };
  }
  const sortOrder = Number.isFinite(Number(input.sort_order)) ? Number(input.sort_order) : 100;

  const { data: before } = await supabase
    .from("partner_regions")
    .select("code, label, parent_code, sort_order, is_active")
    .eq("code", code)
    .maybeSingle();

  const { error } = await supabase.from("partner_regions").upsert({
    code,
    label,
    parent_code: parentCode,
    sort_order: sortOrder,
    is_active: input.is_active ?? true,
  });
  if (error) return { ok: false, error: error.message };

  await writeMasterAuditLog({
    supabase,
    actorUserId: user.id,
    entityType: "region",
    entityCode: code,
    actionType: before ? "update" : "create",
    beforeData: (before as Record<string, unknown> | null) ?? null,
    afterData: { code, label, parent_code: parentCode, sort_order: sortOrder, is_active: input.is_active ?? true },
  });

  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  return { ok: true };
}

export async function updatePartnerRegion(input: UpdatePartnerRegionInput) {
  const auth = await assertAdminOrEditor();
  if (auth.error || !auth.user) return { ok: false, error: auth.error ?? "권한이 없습니다." };
  const { supabase, user } = auth;

  const code = normalizeMasterCode(input.code);
  if (!code) return { ok: false, error: "코드가 필요합니다." };
  if (!isValidMasterCode(code)) return { ok: false, error: "코드 형식이 올바르지 않습니다." };

  const { data: before } = await supabase
    .from("partner_regions")
    .select("code, label, parent_code, sort_order, is_active")
    .eq("code", code)
    .maybeSingle();
  if (!before) return { ok: false, error: "대상 지역을 찾을 수 없습니다." };

  const patch: {
    label?: string;
    parent_code?: string | null;
    sort_order?: number;
    is_active?: boolean;
  } = {};
  if (input.label != null && input.label.trim()) patch.label = input.label.trim();
  if (input.parent_code !== undefined) {
    const parentCode = input.parent_code?.trim() ? normalizeMasterCode(input.parent_code) : null;
    if (parentCode && !isValidMasterCode(parentCode)) return { ok: false, error: "parent_code 형식이 올바르지 않습니다." };
    if (parentCode && parentCode === code) return { ok: false, error: "parent_code는 자기 자신일 수 없습니다." };
    if (parentCode) {
      const { data: parent } = await supabase.from("partner_regions").select("code").eq("code", parentCode).maybeSingle();
      if (!parent) return { ok: false, error: "parent_code 대상 지역이 없습니다." };
    }
    patch.parent_code = parentCode;
  }
  if (input.sort_order != null && Number.isFinite(Number(input.sort_order))) patch.sort_order = Number(input.sort_order);
  if (input.is_active != null) patch.is_active = input.is_active;

  const { error } = await supabase.from("partner_regions").update(patch).eq("code", code);
  if (error) return { ok: false, error: error.message };

  await writeMasterAuditLog({
    supabase,
    actorUserId: user.id,
    entityType: "region",
    entityCode: code,
    actionType: patch.is_active != null ? "toggle_active" : patch.sort_order != null ? "sort_change" : "update",
    beforeData: before as Record<string, unknown>,
    afterData: { ...(before as Record<string, unknown>), ...patch },
  });

  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  return { ok: true };
}
