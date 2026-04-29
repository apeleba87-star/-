import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const templateIdParam = req.nextUrl.searchParams.get("template_id")?.trim();
  const siteIdParam = req.nextUrl.searchParams.get("site_id")?.trim();
  const workSessionIdParam = req.nextUrl.searchParams.get("work_session_id")?.trim();
  const mode = req.nextUrl.searchParams.get("mode")?.trim();
  const supabase = await createServerSupabase();

  await supabase.rpc("ensure_default_checklist_seed", { target_company_id: context.companyId });

  if (mode === "list") {
    const { data: templates, error } = await supabase
      .schema("cleanidex")
      .from("checklist_templates")
      .select("id, name, option_set_id, version, base_template_id")
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, data: templates ?? [] });
  }

  let resolvedTemplateId = templateIdParam ?? "";
  if (!resolvedTemplateId && workSessionIdParam) {
    const { data: sessionTemplate } = await supabase
      .schema("cleanidex")
      .from("work_sessions")
      .select("applied_template_id")
      .eq("id", workSessionIdParam)
      .maybeSingle();
    resolvedTemplateId = sessionTemplate?.applied_template_id ?? "";
  }
  if (!resolvedTemplateId && siteIdParam) {
    const { data: siteTemplate } = await supabase
      .schema("cleanidex")
      .from("site_checklist_templates")
      .select("template_id")
      .eq("site_id", siteIdParam)
      .maybeSingle();
    resolvedTemplateId = siteTemplate?.template_id ?? "";
  }

  let templateQuery = supabase
    .schema("cleanidex")
    .from("checklist_templates")
    .select("id, name, option_set_id")
    .order("created_at", { ascending: true })
    .limit(1);

  if (resolvedTemplateId) {
    templateQuery = supabase
      .schema("cleanidex")
      .from("checklist_templates")
      .select("id, name, option_set_id")
      .eq("id", resolvedTemplateId)
      .limit(1);
  }

  const { data: templateRows, error: templateError } = await templateQuery;
  if (templateError) return NextResponse.json({ ok: false, error: templateError.message }, { status: 400 });

  const template = templateRows?.[0];
  if (!template) return NextResponse.json({ ok: true, data: null });

  const [{ data: items, error: itemsError }, { data: options, error: optionsError }] = await Promise.all([
    supabase
      .schema("cleanidex")
      .from("checklist_items")
      .select("id, title, sort_order")
      .eq("template_id", template.id)
      .order("sort_order", { ascending: true }),
    supabase
      .schema("cleanidex")
      .from("checklist_options")
      .select("id, label, sort_order, color_token")
      .eq("option_set_id", template.option_set_id)
      .order("sort_order", { ascending: true }),
  ]);

  if (itemsError) return NextResponse.json({ ok: false, error: itemsError.message }, { status: 400 });
  if (optionsError) return NextResponse.json({ ok: false, error: optionsError.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    data: {
      template,
      items: items ?? [],
      options: options ?? [],
    },
  });
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  let body: {
    name?: string;
    option_set_id?: string;
    source_template_id?: string;
    item_lines?: string;
  };
  try {
    body = (await req.json()) as {
      name?: string;
      option_set_id?: string;
      source_template_id?: string;
      item_lines?: string;
    };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const sourceTemplateId = body.source_template_id?.trim() ?? "";
  const name = body.name?.trim() ?? "";
  const itemLines = body.item_lines ?? "";

  if (sourceTemplateId) {
    const { data, error } = await supabase.rpc("create_checklist_template_version", {
      p_source_template_id: sourceTemplateId,
      p_name: name || null,
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, data: { id: data } }, { status: 201 });
  }

  let optionSetId = body.option_set_id?.trim() ?? "";
  if (!name) return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });

  if (!optionSetId) {
    const { data: existingOptionSet } = await supabase
      .schema("cleanidex")
      .from("checklist_option_sets")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    optionSetId = existingOptionSet?.id ?? "";
  }

  if (!optionSetId) {
    const { data: createdSet, error: createSetError } = await supabase
      .schema("cleanidex")
      .from("checklist_option_sets")
      .insert({
        company_id: context.companyId,
        name: "기본 점검 옵션",
      })
      .select("id")
      .single();
    if (createSetError) return NextResponse.json({ ok: false, error: createSetError.message }, { status: 400 });
    optionSetId = createdSet.id;

    await supabase.schema("cleanidex").from("checklist_options").insert([
      { company_id: context.companyId, option_set_id: optionSetId, label: "좋음", sort_order: 1, is_active: true },
      { company_id: context.companyId, option_set_id: optionSetId, label: "미흡", sort_order: 2, is_active: true },
    ]);
  }

  const { data, error } = await supabase
    .schema("cleanidex")
    .from("checklist_templates")
    .insert({
      company_id: context.companyId,
      name,
      option_set_id: optionSetId,
      version: 1,
      is_active: true,
    })
    .select("id, name, option_set_id, version, base_template_id")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const items = itemLines
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (items.length > 0) {
    const rows = items.map((title, idx) => ({
      company_id: context.companyId,
      template_id: data.id,
      title,
      sort_order: idx + 1,
    }));
    const { error: itemInsertError } = await supabase.schema("cleanidex").from("checklist_items").insert(rows);
    if (itemInsertError) return NextResponse.json({ ok: false, error: itemInsertError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
