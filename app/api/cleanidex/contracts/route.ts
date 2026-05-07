import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateContractBody = {
  client_id?: string;
  site_id?: string | null;
  template_id?: string | null;
  source_pdf_file_id?: string | null;
  title?: string | null;
};

type ContractRowWithJoins = Record<string, unknown> & {
  clients?: { name?: string } | null;
  sites?: { name?: string } | null;
};

function flattenContractListRow(row: ContractRowWithJoins) {
  const { clients, sites, ...rest } = row;
  return {
    ...rest,
    client_name: typeof clients?.name === "string" ? clients.name : null,
    site_name: typeof sites?.name === "string" ? sites.name : null,
  };
}

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const clientId = req.nextUrl.searchParams.get("client_id")?.trim();
  const status = req.nextUrl.searchParams.get("status")?.trim();
  const signRequestEligible = req.nextUrl.searchParams.get("sign_request_eligible") === "1";

  const supabase = await createServerSupabase();
  let query = supabase
    .schema("cleanidex")
    .from("contracts")
    .select(
      "id, client_id, site_id, template_id, status, title, source_pdf_file_id, signed_pdf_file_id, owner_signed_pdf_file_id, final_pdf_file_id, created_at, updated_at, clients ( name ), sites ( name )"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (clientId) query = query.eq("client_id", clientId);
  if (status) query = query.eq("status", status);
  if (signRequestEligible) {
    query = query.eq("status", "owner_signed").not("owner_signed_pdf_file_id", "is", null);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const rows = (data ?? []).map((row) => flattenContractListRow(row as ContractRowWithJoins));
  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  let body: CreateContractBody;
  try {
    body = (await req.json()) as CreateContractBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const clientId = body.client_id?.trim() ?? "";
  if (!clientId) return NextResponse.json({ ok: false, error: "client_id_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: client, error: clientError } = await supabase
    .schema("cleanidex")
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (clientError) return NextResponse.json({ ok: false, error: clientError.message }, { status: 400 });
  if (!client) return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });

  const { data, error } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .insert({
      company_id: context.companyId,
      client_id: clientId,
      site_id: body.site_id?.trim() || null,
      template_id: body.template_id?.trim() || null,
      source_pdf_file_id: body.source_pdf_file_id?.trim() || null,
      title: body.title?.trim() || null,
      status: "draft",
      created_by: context.userId,
    })
    .select(
      "id, client_id, site_id, template_id, status, title, source_pdf_file_id, created_at, updated_at"
    )
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "contract_created",
    targetTable: "contracts",
    targetId: data.id,
    metadata: { client_id: clientId },
    req,
  });

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
