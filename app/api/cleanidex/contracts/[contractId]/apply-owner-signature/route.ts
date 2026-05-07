import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";
import { composeOwnerSignedPdfWithTextOverlays, parseSignaturePlacement } from "@/lib/cleanidex/contract-pdf";
import { parseContractTextOverlays } from "@/lib/cleanidex/contract-text-overlay";
import { loadKoreanPdfFontBytes } from "@/lib/cleanidex/pdf-korean-font";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ contractId: string }> }) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  const { contractId } = await ctx.params;
  const id = contractId?.trim() ?? "";
  if (!id) return NextResponse.json({ ok: false, error: "contract_id_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: contract, error: cErr } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .select(
      "id, company_id, status, source_pdf_file_id, owner_signature_file_id, owner_signature_placement, owner_signed_pdf_file_id, text_overlays"
    )
    .eq("id", id)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 400 });
  if (!contract) return NextResponse.json({ ok: false, error: "contract_not_found" }, { status: 404 });
  if (contract.status !== "draft") {
    return NextResponse.json({ ok: false, error: "contract_must_be_draft" }, { status: 409 });
  }
  if (!contract.source_pdf_file_id || !contract.owner_signature_file_id || !contract.owner_signature_placement) {
    return NextResponse.json({ ok: false, error: "missing_source_signature_or_placement" }, { status: 400 });
  }

  let placement;
  try {
    placement = parseSignaturePlacement(contract.owner_signature_placement);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "placement_invalid";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  let textOverlays;
  try {
    textOverlays = parseContractTextOverlays(contract.text_overlays ?? []);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "text_overlays_invalid";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  const service = createServiceSupabase();

  /** GET signed URL과 동일: 회사 소속 파일만 세션(RLS)으로 조회. service 단독 조회와 불일치 나는 환경 방지. */
  const { data: sourceFile, error: sErr } = await supabase
    .schema("cleanidex")
    .from("files")
    .select("file_path, mime_type")
    .eq("id", contract.source_pdf_file_id)
    .eq("company_id", context.companyId)
    .maybeSingle();
  if (sErr) {
    return NextResponse.json(
      { ok: false, error: "source_file_lookup_failed", detail: sErr.message },
      { status: 400 }
    );
  }
  if (!sourceFile?.file_path) {
    return NextResponse.json({ ok: false, error: "source_file_not_found" }, { status: 400 });
  }

  const { data: sigFile, error: gErr } = await supabase
    .schema("cleanidex")
    .from("files")
    .select("file_path, mime_type")
    .eq("id", contract.owner_signature_file_id)
    .eq("company_id", context.companyId)
    .maybeSingle();
  if (gErr) {
    return NextResponse.json(
      { ok: false, error: "signature_file_lookup_failed", detail: gErr.message },
      { status: 400 }
    );
  }
  if (!sigFile?.file_path) {
    return NextResponse.json({ ok: false, error: "signature_file_not_found" }, { status: 400 });
  }

  const { data: pdfBlob, error: dlPdf } = await service.storage.from("cleanidex-private").download(sourceFile.file_path);
  if (dlPdf || !pdfBlob) {
    return NextResponse.json({ ok: false, error: dlPdf?.message ?? "pdf_download_failed" }, { status: 400 });
  }
  const { data: pngBlob, error: dlPng } = await service.storage.from("cleanidex-private").download(sigFile.file_path);
  if (dlPng || !pngBlob) {
    return NextResponse.json({ ok: false, error: dlPng?.message ?? "signature_download_failed" }, { status: 400 });
  }

  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

  const needsHangulFont = textOverlays.some((o) => o.content.trim().length > 0);
  let fontBytes: Uint8Array | null = null;
  if (needsHangulFont) {
    try {
      fontBytes = await loadKoreanPdfFontBytes();
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ ok: false, error: "pdf_font_load_failed", detail }, { status: 503 });
    }
  }

  let merged: Uint8Array;
  try {
    const out = await composeOwnerSignedPdfWithTextOverlays(pdfBytes, pngBytes, placement, textOverlays, fontBytes);
    merged = out.merged;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "pdf_merge_failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  const outPath = `${context.companyId}/contracts/${id}/owner-signed-${Date.now()}-${randomUUID()}.pdf`;
  const { error: upErr } = await service.storage.from("cleanidex-private").upload(outPath, merged, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });

  const now = new Date().toISOString();
  const { data: fileRow, error: fErr } = await supabase
    .schema("cleanidex")
    .from("files")
    .insert({
      company_id: context.companyId,
      bucket_name: "cleanidex-private",
      file_path: outPath,
      file_type: "contract_pdf",
      mime_type: "application/pdf",
      size: merged.byteLength,
      uploaded_by: context.userId,
    })
    .select("id")
    .single();
  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 400 });

  const { data: updated, error: uErr } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .update({
      owner_signed_pdf_file_id: fileRow.id,
      owner_signed_at: now,
      status: "owner_signed",
    })
    .eq("id", id)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .eq("status", "draft")
    .select("id, status, owner_signed_pdf_file_id, owner_signed_at")
    .maybeSingle();

  if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 400 });
  if (!updated) {
    await service.storage.from("cleanidex-private").remove([outPath]);
    return NextResponse.json({ ok: false, error: "contract_race_or_state_changed" }, { status: 409 });
  }

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "contract_owner_signed_pdf_created",
    targetTable: "contracts",
    targetId: id,
    metadata: { owner_signed_pdf_file_id: fileRow.id },
    req: _req,
  });

  return NextResponse.json({ ok: true, data: updated });
}
