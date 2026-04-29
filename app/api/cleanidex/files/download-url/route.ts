import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DownloadUrlBody = {
  file_id?: string;
  expires_in_seconds?: number;
};

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  let body: DownloadUrlBody;
  try {
    body = (await req.json()) as DownloadUrlBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const fileId = body.file_id?.trim() ?? "";
  if (!fileId) return NextResponse.json({ ok: false, error: "file_id_required" }, { status: 400 });

  const expiresIn = Math.max(30, Math.min(3600, Number(body.expires_in_seconds ?? 300)));

  const supabase = await createServerSupabase();
  const { data: file, error: fileError } = await supabase
    .schema("cleanidex")
    .from("files")
    .select("id, file_path")
    .eq("id", fileId)
    .maybeSingle();
  if (fileError) return NextResponse.json({ ok: false, error: fileError.message }, { status: 400 });
  if (!file) return NextResponse.json({ ok: false, error: "file_not_found" }, { status: 404 });

  const { data, error } = await supabase.storage
    .from("cleanidex-private")
    .createSignedUrl(file.file_path, expiresIn);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "file_signed_download_url_issued",
    targetTable: "files",
    targetId: fileId,
    metadata: { expires_in_seconds: expiresIn },
    req,
  });

  return NextResponse.json({ ok: true, data: { signed_url: data.signedUrl, expires_in_seconds: expiresIn } });
}
