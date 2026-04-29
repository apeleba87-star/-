import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateFileBody = {
  file_path?: string;
  file_type?: "contract_pdf" | "signature" | "work_photo" | "report_pdf" | "other";
  mime_type?: string;
  size?: number;
  sha256?: string | null;
};

const ALLOWED_FILE_TYPES = new Set(["contract_pdf", "signature", "work_photo", "report_pdf", "other"]);

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const fileType = req.nextUrl.searchParams.get("file_type")?.trim();
  const limit = Math.min(500, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "100")));

  const supabase = await createServerSupabase();
  let query = supabase
    .schema("cleanidex")
    .from("files")
    .select("id, file_path, file_type, mime_type, size, sha256, uploaded_by, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (fileType) query = query.eq("file_type", fileType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  let body: CreateFileBody;
  try {
    body = (await req.json()) as CreateFileBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const filePath = body.file_path?.trim() ?? "";
  const fileType = body.file_type?.trim() ?? "";
  const mimeType = body.mime_type?.trim() ?? "";
  const size = Number(body.size ?? 0);

  if (!filePath) return NextResponse.json({ ok: false, error: "file_path_required" }, { status: 400 });
  if (!fileType || !ALLOWED_FILE_TYPES.has(fileType)) {
    return NextResponse.json({ ok: false, error: "file_type_invalid" }, { status: 400 });
  }
  if (!mimeType) return NextResponse.json({ ok: false, error: "mime_type_required" }, { status: 400 });
  if (!Number.isFinite(size) || size <= 0) return NextResponse.json({ ok: false, error: "size_invalid" }, { status: 400 });
  if (!filePath.startsWith(`${context.companyId}/`)) {
    return NextResponse.json({ ok: false, error: "file_path_company_mismatch" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("files")
    .insert({
      company_id: context.companyId,
      bucket_name: "cleanidex-private",
      file_path: filePath,
      file_type: fileType,
      mime_type: mimeType,
      size,
      sha256: body.sha256?.trim() || null,
      uploaded_by: context.userId,
    })
    .select("id, file_path, file_type, mime_type, size, sha256, uploaded_by, created_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "file_registered",
    targetTable: "files",
    targetId: data.id,
    metadata: { file_type: fileType, file_path: filePath, size },
    req,
  });

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
