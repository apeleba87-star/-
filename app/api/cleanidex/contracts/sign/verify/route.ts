import { createHash, randomUUID } from "crypto";
import { PDFDocument } from "pdf-lib";
import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { CLIENT_ESIGN_CONSENT_TEXT, CLIENT_ESIGN_CONSENT_VERSION } from "@/lib/cleanidex/consent";
import {
  defaultClientSignaturePlacement,
  embedPngSignatureOnPdf,
  parseSignaturePlacement,
} from "@/lib/cleanidex/contract-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  if (!data.token_expires_at || new Date(data.token_expires_at).getTime() < Date.now()) {
    return { error: "token_expired" as const };
  }
  return { data };
}

function contractStateOk(signerType: "client" | "company", status: string) {
  if (signerType === "client") return status === "sent";
  return status === "owner_signed";
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
    .select(
      "id, status, title, source_pdf_file_id, owner_signed_pdf_file_id, final_pdf_file_id, client_signed_at, completed_at"
    )
    .eq("id", resolved.data.contract_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (!contract) return NextResponse.json({ ok: false, error: "contract_not_found" }, { status: 404 });

  if (!contractStateOk(resolved.data.signer_type, contract.status)) {
    return NextResponse.json({ ok: false, error: "contract_wrong_state" }, { status: 409 });
  }

  const pdfFileId = contract.owner_signed_pdf_file_id ?? contract.source_pdf_file_id;
  let sourcePdfSignedUrl: string | null = null;
  if (pdfFileId) {
    const { data: fileData } = await supabase
      .schema("cleanidex")
      .from("files")
      .select("file_path")
      .eq("id", pdfFileId)
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
      contract_title: contract.title,
      consent_text: CLIENT_ESIGN_CONSENT_TEXT,
      consent_version: CLIENT_ESIGN_CONSENT_VERSION,
      completed_at: contract.completed_at,
    },
  });
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  const resolved = await resolveByToken(token);
  if ("error" in resolved) return NextResponse.json({ ok: false, error: resolved.error }, { status: 400 });

  let body: {
    signer_name?: string;
    signer_phone?: string;
    signature_data_url?: string;
    consent?: boolean;
    consent_text_version?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const signerName = body.signer_name?.trim() ?? "";
  if (!signerName) return NextResponse.json({ ok: false, error: "signer_name_required" }, { status: 400 });

  const signerPhone = body.signer_phone?.trim() ?? "";
  if (!signerPhone) return NextResponse.json({ ok: false, error: "signer_phone_required" }, { status: 400 });

  if (!body.consent) {
    return NextResponse.json({ ok: false, error: "consent_required" }, { status: 400 });
  }

  const version = body.consent_text_version?.trim() ?? "";
  if (version !== CLIENT_ESIGN_CONSENT_VERSION) {
    return NextResponse.json({ ok: false, error: "consent_version_mismatch" }, { status: 400 });
  }

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

  const { data: contract, error: cErr } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .select(
      "id, company_id, status, owner_signed_pdf_file_id, client_signature_placement, final_pdf_file_id"
    )
    .eq("id", resolved.data.contract_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (cErr || !contract) {
    return NextResponse.json({ ok: false, error: cErr?.message ?? "contract_not_found" }, { status: 400 });
  }

  if (!contractStateOk(resolved.data.signer_type, contract.status)) {
    return NextResponse.json({ ok: false, error: "contract_wrong_state" }, { status: 409 });
  }
  if (!contract.owner_signed_pdf_file_id) {
    return NextResponse.json({ ok: false, error: "owner_signed_pdf_required" }, { status: 409 });
  }

  const { data: basePdfFile } = await supabase
    .schema("cleanidex")
    .from("files")
    .select("file_path")
    .eq("id", contract.owner_signed_pdf_file_id)
    .maybeSingle();
  if (!basePdfFile?.file_path) {
    return NextResponse.json({ ok: false, error: "owner_signed_pdf_missing" }, { status: 400 });
  }

  const { data: pdfBlob, error: dlPdf } = await supabase.storage.from("cleanidex-private").download(basePdfFile.file_path);
  if (dlPdf || !pdfBlob) {
    return NextResponse.json({ ok: false, error: dlPdf?.message ?? "pdf_download_failed" }, { status: 400 });
  }
  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());

  let placement;
  try {
    if (contract.client_signature_placement) {
      placement = parseSignaturePlacement(contract.client_signature_placement);
    } else {
      const tmp = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      placement = defaultClientSignaturePlacement(tmp.getPageCount());
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "placement_invalid";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  let merged: Uint8Array;
  let finalSha: string;
  try {
    const out = await embedPngSignatureOnPdf(pdfBytes, new Uint8Array(signatureBuffer), placement);
    merged = out.merged;
    finalSha = out.sha256;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "pdf_merge_failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  const signaturePath = `${contract.company_id}/signatures/${Date.now()}-${randomUUID()}.png`;
  const { error: uploadSigErr } = await supabase.storage.from("cleanidex-private").upload(signaturePath, signatureBuffer, {
    contentType: "image/png",
    upsert: false,
  });
  if (uploadSigErr) return NextResponse.json({ ok: false, error: uploadSigErr.message }, { status: 400 });

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

  const finalPath = `${contract.company_id}/contracts/${contract.id}/final-${Date.now()}-${randomUUID()}.pdf`;
  const { error: upFinalErr } = await supabase.storage.from("cleanidex-private").upload(finalPath, merged, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upFinalErr) return NextResponse.json({ ok: false, error: upFinalErr.message }, { status: 400 });

  const { data: finalFile, error: finalFileErr } = await supabase
    .schema("cleanidex")
    .from("files")
    .insert({
      company_id: resolved.data.company_id,
      bucket_name: "cleanidex-private",
      file_path: finalPath,
      file_type: "contract_pdf",
      mime_type: "application/pdf",
      size: merged.byteLength,
      sha256: finalSha,
      uploaded_by: null,
    })
    .select("id")
    .single();
  if (finalFileErr) return NextResponse.json({ ok: false, error: finalFileErr.message }, { status: 400 });

  const { data: inserted, error: signError } = await supabase
    .schema("cleanidex")
    .from("contract_signatures")
    .insert({
      company_id: resolved.data.company_id,
      contract_id: resolved.data.contract_id,
      signer_type: resolved.data.signer_type,
      signer_name: signerName,
      signer_phone: signerPhone,
      signature_file_id: signatureFile.id,
      consent_text: CLIENT_ESIGN_CONSENT_TEXT,
      consent_text_version: CLIENT_ESIGN_CONSENT_VERSION,
      sign_request_id: resolved.data.id,
      ip: ip ?? null,
      device,
      signed_at: now,
    })
    .select("id")
    .single();
  if (signError) return NextResponse.json({ ok: false, error: signError.message }, { status: 400 });

  const { error: reqUpErr } = await supabase
    .schema("cleanidex")
    .from("contract_sign_requests")
    .update({
      completed_at: now,
      completed_ip: ip ?? null,
      completed_device: device,
      token_hash: null,
    })
    .eq("id", resolved.data.id)
    .is("completed_at", null);
  if (reqUpErr) return NextResponse.json({ ok: false, error: reqUpErr.message }, { status: 400 });

  const { error: conErr } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .update({
      status: "completed",
      signed_pdf_file_id: finalFile.id,
      final_pdf_file_id: finalFile.id,
      final_pdf_sha256: finalSha,
      client_signed_at: now,
      completed_at: now,
    })
    .eq("id", resolved.data.contract_id)
    .is("deleted_at", null)
    .in("status", resolved.data.signer_type === "client" ? ["sent"] : ["owner_signed"]);

  if (conErr) return NextResponse.json({ ok: false, error: conErr.message }, { status: 400 });

  await supabase.schema("cleanidex").from("audit_logs").insert({
    company_id: resolved.data.company_id,
    actor_user_id: null,
    action: "contract_signed_public_link",
    target_table: "contract_signatures",
    target_id: inserted.id,
    ip: ip ?? null,
    device,
    metadata: {
      contract_id: resolved.data.contract_id,
      signer_type: resolved.data.signer_type,
      final_pdf_file_id: finalFile.id,
      final_pdf_sha256: finalSha,
    },
  });

  let finalPdfSignedUrl: string | null = null;
  const { data: signed } = await supabase.storage.from("cleanidex-private").createSignedUrl(finalPath, 3600);
  finalPdfSignedUrl = signed?.signedUrl ?? null;

  return NextResponse.json({
    ok: true,
    data: {
      contract_id: resolved.data.contract_id,
      signed_at: now,
      completed_at: now,
      final_pdf_signed_url: finalPdfSignedUrl,
    },
  });
}
