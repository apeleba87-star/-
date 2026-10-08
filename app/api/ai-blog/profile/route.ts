import { NextRequest, NextResponse } from "next/server";
import {
  cleanText,
  getAiBlogUser,
  jsonError,
  loadProfile,
  loadUsage,
  nullableInt,
  nullableText,
  textArray,
} from "@/lib/ai-blog/server";
import type { WritingStyle } from "@/lib/ai-blog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STYLES = new Set<WritingStyle>(["story", "expert", "checkpoint"]);

export async function GET() {
  const got = await getAiBlogUser();
  if (!got) return jsonError("auth_required", 401);
  const { supabase, user } = got;
  if (!user.companyId) {
    return NextResponse.json({ ok: true, data: { profile: null, usage: null, role_code: null } });
  }
  const [profile, usage] = await Promise.all([loadProfile(supabase, user.companyId), loadUsage(supabase)]);
  return NextResponse.json({ ok: true, data: { profile, usage, role_code: user.roleCode } });
}

export async function PUT(req: NextRequest) {
  const got = await getAiBlogUser();
  if (!got) return jsonError("auth_required", 401);
  const { supabase, user } = got;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("invalid_json_body");
  }

  const businessName = cleanText(body.business_name, 100);
  if (!businessName) return jsonError("business_name_required");

  let companyId = user.companyId;
  if (companyId && user.roleCode !== "admin") return jsonError("admin_required", 403);
  if (!companyId) {
    if (user.access.state !== "active") return jsonError(`ai_access_${user.access.state}`, 403);
    const { data, error } = await supabase.rpc("cleanidex_ai_bootstrap_company", { p_business_name: businessName });
    if (error || !data) return jsonError(error?.message ?? "company_bootstrap_failed");
    companyId = data as string;
  }

  const style = cleanText(body.writing_style, 20) as WritingStyle;
  const row = {
    company_id: companyId,
    business_name: businessName,
    owner_name: nullableText(body.owner_name, 50),
    phone: nullableText(body.phone, 30),
    base_region: nullableText(body.base_region, 100),
    service_regions: textArray(body.service_regions, 20, 50),
    main_services: textArray(body.main_services, 10, 30),
    career_years: nullableInt(body.career_years, 0, 80),
    intro: nullableText(body.intro, 1000),
    strengths: nullableText(body.strengths, 1000),
    target_customers: nullableText(body.target_customers, 300),
    writing_style: STYLES.has(style) ? style : "story",
    cta_text: nullableText(body.cta_text, 300),
    homepage_url: nullableText(body.homepage_url, 300),
    naver_place_url: nullableText(body.naver_place_url, 300),
    banned_phrases: textArray(body.banned_phrases, 50, 50),
  };

  const { data, error } = await supabase
    .schema("cleanidex")
    .from("business_profiles")
    .upsert(row, { onConflict: "company_id" })
    .select("company_id")
    .single();
  if (error) return jsonError(error.message);

  return NextResponse.json({ ok: true, data });
}
