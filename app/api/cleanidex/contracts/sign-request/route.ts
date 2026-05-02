import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  let body: {
    contract_id?: string;
    signer_type?: "client" | "company";
    recipient_name?: string;
    recipient_contact?: string;
    expires_in_hours?: number;
  };
  try {
    body = (await req.json()) as {
      contract_id?: string;
      signer_type?: "client" | "company";
      recipient_name?: string;
      recipient_contact?: string;
      expires_in_hours?: number;
    };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const contractId = body.contract_id?.trim() ?? "";
  const signerType = body.signer_type === "company" ? "company" : "client";
  if (!contractId) return NextResponse.json({ ok: false, error: "contract_id_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: contract, error: contractError } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .select("id, status, owner_signed_pdf_file_id")
    .eq("id", contractId)
    .eq("company_id", context.companyId)
    .maybeSingle();

  if (contractError) return NextResponse.json({ ok: false, error: contractError.message }, { status: 400 });
  if (!contract) return NextResponse.json({ ok: false, error: "contract_not_found" }, { status: 404 });

  if (signerType === "client") {
    if (contract.status !== "owner_signed") {
      return NextResponse.json({ ok: false, error: "contract_must_be_owner_signed" }, { status: 409 });
    }
    if (!contract.owner_signed_pdf_file_id) {
      return NextResponse.json({ ok: false, error: "owner_signed_pdf_required" }, { status: 409 });
    }
  }

  const nowIso = new Date().toISOString();
  await supabase
    .schema("cleanidex")
    .from("contract_sign_requests")
    .update({ token_expires_at: nowIso })
    .eq("contract_id", contractId)
    .eq("signer_type", signerType)
    .is("completed_at", null);

  const rawToken = randomBytes(24).toString("hex");
  const tokenHash = sha256(rawToken);
  const expiresInHours = Math.min(168, Math.max(1, Number(body.expires_in_hours ?? 72)));
  const tokenExpiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .schema("cleanidex")
    .from("contract_sign_requests")
    .insert({
      company_id: context.companyId,
      contract_id: contractId,
      signer_type: signerType,
      recipient_name: body.recipient_name?.trim() || null,
      recipient_contact: body.recipient_contact?.trim() || null,
      token_hash: tokenHash,
      token_expires_at: tokenExpiresAt,
      created_by: context.userId,
    })
    .select("id, contract_id, signer_type, token_expires_at")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  if (signerType === "client") {
    const { error: sentErr } = await supabase
      .schema("cleanidex")
      .from("contracts")
      .update({ status: "sent" })
      .eq("id", contractId)
      .eq("company_id", context.companyId)
      .eq("status", "owner_signed");
    if (sentErr) return NextResponse.json({ ok: false, error: sentErr.message }, { status: 400 });
  }

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "contract_sign_request_issued",
    targetTable: "contract_sign_requests",
    targetId: data.id,
    metadata: { contract_id: contractId, signer_type: signerType, token_expires_at: tokenExpiresAt },
    req,
  });

  return NextResponse.json({
    ok: true,
    data: {
      ...data,
      token: rawToken,
      sign_path: `/cleanidex/sign?token=${rawToken}`,
    },
  });
}
