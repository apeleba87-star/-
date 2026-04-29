import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SignedUploadBody = {
  file_type?: "contract_pdf" | "signature" | "work_photo" | "report_pdf" | "other";
  extension?: string;
};

const FILE_TYPE_FOLDER: Record<string, string> = {
  contract_pdf: "contracts",
  signature: "signatures",
  work_photo: "work-photos",
  report_pdf: "reports",
  other: "other",
};

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  let body: SignedUploadBody;
  try {
    body = (await req.json()) as SignedUploadBody;
  } catch {
    body = {};
  }

  const fileType = body.file_type?.trim() ?? "other";
  const folder = FILE_TYPE_FOLDER[fileType];
  if (!folder) return NextResponse.json({ ok: false, error: "file_type_invalid" }, { status: 400 });

  const extension = (body.extension?.trim() ?? "bin").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  const path = `${context.companyId}/${folder}/${Date.now()}-${randomUUID()}.${extension}`;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.storage.from("cleanidex-private").createSignedUploadUrl(path);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "file_signed_upload_url_issued",
    targetTable: "files",
    metadata: { file_type: fileType, file_path: path },
    req,
  });

  return NextResponse.json({
    ok: true,
    data: {
      file_path: path,
      token: data.token,
      signed_url: data.signedUrl,
      path: data.path,
    },
  });
}
