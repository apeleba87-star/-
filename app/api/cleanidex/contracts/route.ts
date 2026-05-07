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

function parseLimit(raw: string | null, fallback: number, max: number) {
  const n = Number(raw ?? "");
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const clientId = sp.get("client_id")?.trim();
  const siteId = sp.get("site_id")?.trim();
  const status = sp.get("status")?.trim();
  const signRequestEligible = sp.get("sign_request_eligible") === "1";
  const includeDeleted = sp.get("include_deleted") === "1";
  const trashOnly = sp.get("trash") === "1";
  const titleQ = sp.get("q")?.trim() ?? "";
  const limit = parseLimit(sp.get("limit"), 50, 100);
  const cursorCreatedAt = sp.get("cursor_created_at")?.trim();
  const cursorId = sp.get("cursor_id")?.trim();

  const supabase = await createServerSupabase();
  let query = supabase
    .schema("cleanidex")
    .from("contracts")
    .select(
      "id, client_id, site_id, template_id, status, title, source_pdf_file_id, signed_pdf_file_id, owner_signed_pdf_file_id, final_pdf_file_id, owner_signed_at, client_signed_at, completed_at, created_at, updated_at, deleted_at, deleted_by, deleted_reason, clients ( name ), sites ( name )"
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (trashOnly) {
    query = query.not("deleted_at", "is", null);
  } else if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (clientId) query = query.eq("client_id", clientId);
  if (siteId) query = query.eq("site_id", siteId);
  if (status) query = query.eq("status", status);
  if (signRequestEligible) {
    query = query.eq("status", "owner_signed").not("owner_signed_pdf_file_id", "is", null);
  }
  if (titleQ) {
    const escaped = titleQ.replace(/[\\%_,]/g, (m) => `\\${m}`);
    query = query.ilike("title", `%${escaped}%`);
  }
  if (cursorCreatedAt && cursorId) {
    query = query.or(
      `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const raw = (data ?? []) as ContractRowWithJoins[];
  const hasMore = raw.length > limit;
  const page = hasMore ? raw.slice(0, limit) : raw;
  const rows = page.map((row) => flattenContractListRow(row));
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last && typeof last.created_at === "string" && typeof last.id === "string"
      ? { created_at: last.created_at, id: last.id }
      : null;

  return NextResponse.json({
    ok: true,
    data: rows,
    pagination: { has_more: hasMore, limit, next_cursor: nextCursor },
  });
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
