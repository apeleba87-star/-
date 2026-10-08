import "server-only";
import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import type { LlmUsage } from "@/lib/ai-blog/openai";
import type {
  BusinessProfile,
  MediaPair,
  Project,
  ProjectAttribute,
  AiAccess,
  ProjectMedia,
  UsageSummary,
} from "@/lib/ai-blog/types";
import { computeAccess, SITE_ADMIN_ACCESS, type AccessRow } from "@/lib/ai-blog/access";

export type AiBlogUser = {
  userId: string;
  companyId: string | null;
  roleCode: string | null;
  access: AiAccess;
};

export type AiBlogAdmin = AiBlogUser & { companyId: string };

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

export const PROJECT_SELECT =
  "id, company_id, service_type, region_sido, region_sigungu, region_dong, property_type, area_pyeong, worker_count, work_minutes, price, work_date, description, created_at, updated_at";
export const MEDIA_SELECT =
  "id, media_type, sort_order, space_type, local_name, local_size, local_modified_at, taken_at, width, height";
export const PAIR_SELECT = "id, label, memo, before_media_id, after_media_id, sort_order";
export const CONTENT_SELECT =
  "id, company_id, project_id, channel, keyword, secondary_keywords, extra_request, mode, variant, title, title_candidates, blocks, status, ai_model, prompt_version, generation_count, partial_rewrite_count, created_at, updated_at";
export const PROFILE_SELECT =
  "company_id, business_name, owner_name, phone, base_region, service_regions, main_services, career_years, intro, strengths, target_customers, writing_style, cta_text, homepage_url, naver_place_url, banned_phrases";

export function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function getAiBlogUser(): Promise<{ supabase: Supabase; user: AiBlogUser } | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data }, { data: accessRow }, { data: siteProfile }] = await Promise.all([
    supabase.rpc("cleanidex_my_context").maybeSingle(),
    supabase
      .schema("cleanidex")
      .from("ai_blog_access")
      .select("plan_code, status, expires_on")
      .eq("user_id", user.id)
      .maybeSingle<AccessRow>(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string | null }>(),
  ]);
  const row = data as { company_id?: string | null; role_code?: string | null } | null;
  const isSiteAdmin = siteProfile?.role === "admin";
  return {
    supabase,
    user: {
      userId: user.id,
      companyId: row?.company_id ?? null,
      roleCode: row?.role_code ?? null,
      access: isSiteAdmin ? SITE_ADMIN_ACCESS : computeAccess(accessRow ?? null),
    },
  };
}

/**
 * AI 블로그 API 공통 가드: 로그인 + 회사 소속 + admin(대표).
 * requireActive: 새 현장·초안 생성, AI 호출처럼 유효한 사용 권한이 필요한 작업.
 */
export async function requireAiAdmin(opts: { requireActive?: boolean } = {}): Promise<
  { ok: true; supabase: Supabase; ctx: AiBlogAdmin } | { ok: false; response: NextResponse }
> {
  const got = await getAiBlogUser();
  if (!got) return { ok: false, response: jsonError("auth_required", 401) };
  if (opts.requireActive && got.user.access.state !== "active") {
    return { ok: false, response: jsonError(`ai_access_${got.user.access.state}`, 403) };
  }
  if (!got.user.companyId) return { ok: false, response: jsonError("business_profile_required", 403) };
  if (got.user.roleCode !== "admin") return { ok: false, response: jsonError("admin_required", 403) };
  return { ok: true, supabase: got.supabase, ctx: got.user as AiBlogAdmin };
}

/** 사이트 운영자(profiles.role = admin) 전용 가드 */
export async function requireSiteAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: jsonError("auth_required", 401) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if ((profile as { role?: string } | null)?.role !== "admin") {
    return { ok: false, response: jsonError("site_admin_required", 403) };
  }
  return { ok: true, userId: user.id };
}

export async function loadProfile(supabase: Supabase, companyId: string): Promise<BusinessProfile | null> {
  const { data } = await supabase
    .schema("cleanidex")
    .from("business_profiles")
    .select(PROFILE_SELECT)
    .eq("company_id", companyId)
    .maybeSingle<BusinessProfile>();
  return data ?? null;
}

export async function loadUsage(supabase: Supabase): Promise<UsageSummary | null> {
  const { data } = await supabase.rpc("cleanidex_ai_usage_summary").maybeSingle<UsageSummary>();
  return data ?? null;
}

export type ProjectBundle = {
  project: Project;
  attributes: ProjectAttribute[];
  media: ProjectMedia[];
  pairs: MediaPair[];
};

export async function loadProjectBundle(supabase: Supabase, projectId: string): Promise<ProjectBundle | null> {
  const db = supabase.schema("cleanidex");
  const [{ data: project }, { data: attributes }, { data: media }, { data: pairs }] = await Promise.all([
    db.from("projects").select(PROJECT_SELECT).eq("id", projectId).is("deleted_at", null).maybeSingle<Project>(),
    db.from("project_attributes").select("id, attr_type, ref_id, custom_label").eq("project_id", projectId),
    db.from("project_media").select(MEDIA_SELECT).eq("project_id", projectId).order("sort_order"),
    db.from("media_pairs").select(PAIR_SELECT).eq("project_id", projectId).order("sort_order"),
  ]);
  if (!project) return null;
  return {
    project,
    attributes: (attributes ?? []) as ProjectAttribute[],
    media: (media ?? []) as ProjectMedia[],
    pairs: (pairs ?? []) as MediaPair[],
  };
}

async function estimateCostKrw(model: string, usage: LlmUsage): Promise<number | null> {
  const service = createServiceSupabase();
  const { data } = await service
    .schema("cleanidex")
    .from("ai_model_prices")
    .select("input_per_1m_usd, cached_input_per_1m_usd, output_per_1m_usd, usd_krw")
    .eq("model", model)
    .maybeSingle<{ input_per_1m_usd: number; cached_input_per_1m_usd: number; output_per_1m_usd: number; usd_krw: number }>();
  if (!data) return null;
  const uncached = Math.max(usage.inputTokens - usage.cachedTokens, 0);
  const usd =
    (uncached * Number(data.input_per_1m_usd) +
      usage.cachedTokens * Number(data.cached_input_per_1m_usd) +
      usage.outputTokens * Number(data.output_per_1m_usd)) /
    1_000_000;
  return Math.round(usd * Number(data.usd_krw) * 100) / 100;
}

export async function logAiUsage(args: {
  ctx: AiBlogAdmin;
  contentId: string;
  feature: "generate" | "regenerate" | "rewrite_partial";
  model: string;
  usage?: LlmUsage;
  latencyMs?: number;
  status: "success" | "error";
  errorCode?: string;
}): Promise<void> {
  try {
    const usage = args.usage ?? { inputTokens: 0, cachedTokens: 0, outputTokens: 0 };
    const cost = args.usage ? await estimateCostKrw(args.model, usage) : null;
    const service = createServiceSupabase();
    await service.schema("cleanidex").from("ai_usage_logs").insert({
      company_id: args.ctx.companyId,
      user_id: args.ctx.userId,
      content_id: args.contentId,
      feature: args.feature,
      model: args.model,
      input_tokens: usage.inputTokens,
      cached_tokens: usage.cachedTokens,
      output_tokens: usage.outputTokens,
      estimated_cost_krw: cost,
      latency_ms: args.latencyMs ?? null,
      status: args.status,
      error_code: args.errorCode ?? null,
    });
  } catch (e) {
    console.error("[ai-blog] usage log failed", e);
  }
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export function cleanText(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function nullableText(v: unknown, max = 2000): string | null {
  const t = cleanText(v, max);
  return t ? t : null;
}

export function nullableInt(v: unknown, min = 0, max = 1_000_000): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(Math.round(n), min), max);
}

export function textArray(v: unknown, maxItems = 30, maxLen = 100): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(
    new Set(v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, maxLen)).filter(Boolean)),
  ).slice(0, maxItems);
}
