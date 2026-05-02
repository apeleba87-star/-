import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateSignatureBody = {
  contract_id?: string;
  signer_type?: "client" | "company";
  signer_name?: string | null;
  signature_file_id?: string | null;
};

function requestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");
}

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const contractId = req.nextUrl.searchParams.get("contract_id")?.trim();
  if (!contractId) {
    return NextResponse.json({ ok: false, error: "contract_id_required" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("contract_signatures")
    .select("id, contract_id, signer_type, signer_name, signature_file_id, ip, device, signed_at, created_at")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  let body: CreateSignatureBody;
  try {
    body = (await req.json()) as CreateSignatureBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const contractId = body.contract_id?.trim() ?? "";
  const signerType = body.signer_type;
  if (!contractId) return NextResponse.json({ ok: false, error: "contract_id_required" }, { status: 400 });
  if (!signerType || !["client", "company"].includes(signerType)) {
    return NextResponse.json({ ok: false, error: "signer_type_invalid" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data: contract, error: contractError } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .select("id, status")
    .eq("id", contractId)
    .maybeSingle();
  if (contractError) return NextResponse.json({ ok: false, error: contractError.message }, { status: 400 });
  if (!contract) return NextResponse.json({ ok: false, error: "contract_not_found" }, { status: 404 });

  const ip = requestIp(req);
  const device = req.headers.get("user-agent");

  const { data, error } = await supabase
    .schema("cleanidex")
    .from("contract_signatures")
    .insert({
      company_id: context.companyId,
      contract_id: contractId,
      signer_type: signerType,
      signer_name: body.signer_name?.trim() || null,
      signature_file_id: body.signature_file_id?.trim() || null,
      ip,
      device,
    })
    .select("id, contract_id, signer_type, signer_name, signature_file_id, ip, device, signed_at, created_at")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "contract_signed",
    targetTable: "contract_signatures",
    targetId: data.id,
    metadata: { contract_id: contractId, signer_type: signerType },
    req,
  });

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
