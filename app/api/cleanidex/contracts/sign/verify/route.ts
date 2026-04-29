import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function requestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");
}

async function resolveByToken(token: string) {
  if (!token) return { error: "token_required" as const };
  const supabase = createServiceSupabase();
  const tokenHash = sha256(token);
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("contract_sign_requests")
    .select("id, company_id, contract_id, signer_type, token_expires_at, opened_at, completed_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "token_not_found" as const };
  if (data.completed_at) return { error: "already_completed" as const };
  if (!data.token_expires_at || new Date(data.token_expires_at).getTime() < Date.now()) return { error: "token_expired" as const };
  return { data };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  const resolved = await resolveByToken(token);
  if ("error" in resolved) return NextResponse.json({ ok: false, error: resolved.error }, { status: 400 });
  const supabase = createServiceSupabase();

  if (!resolved.data.opened_at) {
    await supabase
      .schema("cleanidex")
      .from("contract_sign_requests")
      .update({
        opened_at: new Date().toISOString(),
        opened_ip: requestIp(req),
        opened_device: req.headers.get("user-agent"),
      })
      .eq("id", resolved.data.id);
  }

  const { data: contract, error } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .select("id, status, source_pdf_file_id")
    .eq("id", resolved.data.contract_id)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (!contract) return NextResponse.json({ ok: false, error: "contract_not_found" }, { status: 404 });

  let sourcePdfSignedUrl: string | null = null;
  if (contract.source_pdf_file_id) {
    const { data: fileData } = await supabase
      .schema("cleanidex")
      .from("files")
      .select("file_path")
      .eq("id", contract.source_pdf_file_id)
      .maybeSingle();
    if (fileData?.file_path) {
      const { data: signed } = await supabase.storage.from("cleanidex-private").createSignedUrl(fileData.file_path, 600);
      sourcePdfSignedUrl = signed?.signedUrl ?? null;
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      request_id: resolved.data.id,
      contract_id: contract.id,
      signer_type: resolved.data.signer_type,
      token_expires_at: resolved.data.token_expires_at,
      source_pdf_signed_url: sourcePdfSignedUrl,
    },
  });
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  const resolved = await resolveByToken(token);
  if ("error" in resolved) return NextResponse.json({ ok: false, error: resolved.error }, { status: 400 });

  let body: { signer_name?: string; signature_data_url?: string };
  try {
    body = (await req.json()) as { signer_name?: string; signature_data_url?: string };
  } catch {
    body = {};
  }

  const signerName = body.signer_name?.trim() ?? "";
  if (!signerName) return NextResponse.json({ ok: false, error: "signer_name_required" }, { status: 400 });
  const signatureDataUrl = body.signature_data_url?.trim() ?? "";
  if (!signatureDataUrl.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ ok: false, error: "signature_data_url_invalid" }, { status: 400 });
  }

  const supabase = createServiceSupabase();
  const now = new Date().toISOString();
  const ip = requestIp(req);
  const device = req.headers.get("user-agent");
  const base64Payload = signatureDataUrl.slice("data:image/png;base64,".length);
  const signatureBuffer = Buffer.from(base64Payload, "base64");
  if (!signatureBuffer.length) return NextResponse.json({ ok: false, error: "signature_data_empty" }, { status: 400 });
  if (signatureBuffer.length > 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "signature_data_too_large" }, { status: 400 });
  }

  const signaturePath = `${resolved.data.company_id}/signatures/${Date.now()}-${randomUUID()}.png`;
  const { error: uploadError } = await supabase.storage.from("cleanidex-private").upload(signaturePath, signatureBuffer, {
    contentType: "image/png",
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ ok: false, error: uploadError.message }, { status: 400 });

  const { data: signatureFile, error: signatureFileError } = await supabase
    .schema("cleanidex")
    .from("files")
    .insert({
      company_id: resolved.data.company_id,
      bucket_name: "cleanidex-private",
      file_path: signaturePath,
      file_type: "signature",
      mime_type: "image/png",
      size: signatureBuffer.length,
      uploaded_by: null,
    })
    .select("id")
    .single();
  if (signatureFileError) return NextResponse.json({ ok: false, error: signatureFileError.message }, { status: 400 });

  const { data: inserted, error: signError } = await supabase
    .schema("cleanidex")
    .from("contract_signatures")
    .insert({
      company_id: resolved.data.company_id,
      contract_id: resolved.data.contract_id,
      signer_type: resolved.data.signer_type,
      signer_name: signerName,
      signature_file_id: signatureFile.id,
      ip,
      device,
      signed_at: now,
    })
    .select("id")
    .single();
  if (signError) return NextResponse.json({ ok: false, error: signError.message }, { status: 400 });

  await supabase
    .schema("cleanidex")
    .from("contract_sign_requests")
    .update({
      completed_at: now,
      completed_ip: ip,
      completed_device: device,
      token_hash: null,
    })
    .eq("id", resolved.data.id);

  if (resolved.data.signer_type === "client") {
    await supabase.schema("cleanidex").from("contracts").update({ status: "signed" }).eq("id", resolved.data.contract_id);
  }

  await supabase.schema("cleanidex").from("audit_logs").insert({
    company_id: resolved.data.company_id,
    actor_user_id: null,
    action: "contract_signed_public_link",
    target_table: "contract_signatures",
    target_id: inserted.id,
    ip,
    device,
    metadata: { contract_id: resolved.data.contract_id, signer_type: resolved.data.signer_type },
  });

  return NextResponse.json({ ok: true, data: { contract_id: resolved.data.contract_id, signed_at: now } });
}
