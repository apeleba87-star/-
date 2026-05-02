import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";
import { parseContractTextOverlays } from "@/lib/cleanidex/contract-text-overlay";
import { parseSignaturePlacement } from "@/lib/cleanidex/contract-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchBody = {
  title?: string | null;
  source_pdf_file_id?: string | null;
  owner_signature_file_id?: string | null;
  owner_signature_placement?: unknown;
  client_signature_placement?: unknown;
  text_overlays?: unknown;
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ contractId: string }> }) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  const { contractId } = await ctx.params;
  const id = contractId?.trim() ?? "";
  if (!id) return NextResponse.json({ ok: false, error: "contract_id_required" }, { status: 400 });

  const wantSignedUrls = req.nextUrl.searchParams.get("signed_urls") === "1";

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .select(
      "id, company_id, client_id, site_id, template_id, status, title, source_pdf_file_id, signed_pdf_file_id, owner_signature_file_id, owner_signed_pdf_file_id, final_pdf_file_id, owner_signature_placement, client_signature_placement, text_overlays, owner_signed_at, client_signed_at, completed_at, final_pdf_sha256, created_at, updated_at"
    )
    .eq("id", id)
    .eq("company_id", context.companyId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ ok: false, error: "contract_not_found" }, { status: 404 });

  if (!wantSignedUrls) {
    return NextResponse.json({ ok: true, data });
  }

  const fileIds = [data.source_pdf_file_id, data.owner_signed_pdf_file_id, data.final_pdf_file_id].filter(
    (x): x is string => typeof x === "string" && x.length > 0
  );

  const signed_urls: Record<string, string | null> = {
    source_pdf: null,
    owner_signed_pdf: null,
    final_pdf: null,
  };
  const ttl = 600;

  if (fileIds.length > 0) {
    const { data: fileRows, error: filesError } = await supabase
      .schema("cleanidex")
      .from("files")
      .select("id, file_path")
      .eq("company_id", context.companyId)
      .in("id", fileIds);
    if (filesError) return NextResponse.json({ ok: false, error: filesError.message }, { status: 400 });

    const pathById = new Map((fileRows ?? []).map((r) => [r.id, r.file_path] as const));

    async function signFor(key: keyof typeof signed_urls, fid: string | null) {
      if (!fid) return;
      const p = pathById.get(fid);
      if (!p) return;
      const { data: signed } = await supabase.storage.from("cleanidex-private").createSignedUrl(p, ttl);
      signed_urls[key] = signed?.signedUrl ?? null;
    }

    await signFor("source_pdf", data.source_pdf_file_id);
    await signFor("owner_signed_pdf", data.owner_signed_pdf_file_id);
    await signFor("final_pdf", data.final_pdf_file_id);
  }

  return NextResponse.json({
    ok: true,
    data: {
      ...data,
      signed_urls,
      signed_urls_expires_in_seconds: ttl,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ contractId: string }> }) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  const { contractId } = await ctx.params;
  const id = contractId?.trim() ?? "";
  if (!id) return NextResponse.json({ ok: false, error: "contract_id_required" }, { status: 400 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data: existing, error: loadError } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .select("id, status")
    .eq("id", id)
    .eq("company_id", context.companyId)
    .maybeSingle();

  if (loadError) return NextResponse.json({ ok: false, error: loadError.message }, { status: 400 });
  if (!existing) return NextResponse.json({ ok: false, error: "contract_not_found" }, { status: 404 });

  if (existing.status === "completed" || existing.status === "cancelled") {
    return NextResponse.json({ ok: false, error: "contract_not_editable" }, { status: 409 });
  }

  const patch: Record<string, unknown> = {};

  if (body.title !== undefined) {
    patch.title = body.title?.trim() || null;
  }
  if (body.source_pdf_file_id !== undefined) {
    if (existing.status !== "draft") {
      return NextResponse.json({ ok: false, error: "source_pdf_locked" }, { status: 409 });
    }
    patch.source_pdf_file_id = body.source_pdf_file_id?.trim() || null;
  }
  if (body.owner_signature_file_id !== undefined) {
    if (existing.status !== "draft") {
      return NextResponse.json({ ok: false, error: "owner_signature_locked" }, { status: 409 });
    }
    patch.owner_signature_file_id = body.owner_signature_file_id?.trim() || null;
  }
  if (body.owner_signature_placement !== undefined) {
    if (existing.status !== "draft") {
      return NextResponse.json({ ok: false, error: "owner_placement_locked" }, { status: 409 });
    }
    if (body.owner_signature_placement === null) {
      patch.owner_signature_placement = null;
    } else {
      try {
        patch.owner_signature_placement = parseSignaturePlacement(body.owner_signature_placement);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "placement_invalid";
        return NextResponse.json({ ok: false, error: msg }, { status: 400 });
      }
    }
  }
  if (body.client_signature_placement !== undefined) {
    if (
      existing.status !== "draft" &&
      existing.status !== "owner_signed" &&
      existing.status !== "sent"
    ) {
      return NextResponse.json({ ok: false, error: "client_placement_locked" }, { status: 409 });
    }
    if (body.client_signature_placement === null) {
      patch.client_signature_placement = null;
    } else {
      try {
        patch.client_signature_placement = parseSignaturePlacement(body.client_signature_placement);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "placement_invalid";
        return NextResponse.json({ ok: false, error: msg }, { status: 400 });
      }
    }
  }
  if (body.text_overlays !== undefined) {
    if (existing.status !== "draft") {
      return NextResponse.json({ ok: false, error: "text_overlays_locked" }, { status: 409 });
    }
    try {
      patch.text_overlays = parseContractTextOverlays(body.text_overlays);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "text_overlays_invalid";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "no_updates" }, { status: 400 });
  }

  if (existing.status === "sent") {
    const keys = Object.keys(patch);
    const allowedOnly = keys.length === 1 && keys[0] === "client_signature_placement";
    if (!allowedOnly) {
      return NextResponse.json({ ok: false, error: "only_client_placement_while_sent" }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .update(patch)
    .eq("id", id)
    .eq("company_id", context.companyId)
    .select(
      "id, status, title, source_pdf_file_id, owner_signature_file_id, owner_signed_pdf_file_id, final_pdf_file_id, owner_signature_placement, client_signature_placement, text_overlays, updated_at"
    )
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "contract_updated",
    targetTable: "contracts",
    targetId: id,
    metadata: { fields: Object.keys(patch) },
    req,
  });

  return NextResponse.json({ ok: true, data });
}
