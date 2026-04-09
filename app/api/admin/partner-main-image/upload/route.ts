import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { PARTNER_PORTFOLIO_BUCKET } from "@/lib/partners/portfolio-constants";
import { makePartnerMainCoverWebp } from "@/lib/partners/process-main-cover-image";
import { PORTFOLIO_ALLOWED_MIME } from "@/lib/partners/process-portfolio-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

function revalidatePartner(companyId: string) {
  revalidatePath("/partners");
  revalidatePath(`/partners/${companyId}`);
  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${companyId}/edit`);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const companyId = String(form.get("company_id") ?? "").trim();
  const file = form.get("file");
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "company_id가 필요합니다." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "이미지 파일을 선택해 주세요." }, { status: 400 });
  }
  if (!PORTFOLIO_ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ ok: false, error: "JPG, PNG, WebP, GIF만 업로드할 수 있습니다." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "파일 크기는 8MB 이하여야 합니다." }, { status: 400 });
  }

  const { data: company } = await supabase.from("partner_companies").select("id").eq("id", companyId).maybeSingle();
  if (!company) {
    return NextResponse.json({ ok: false, error: "업체를 찾을 수 없습니다." }, { status: 404 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let webp: Buffer;
  try {
    webp = await makePartnerMainCoverWebp(buf);
  } catch {
    return NextResponse.json({ ok: false, error: "이미지 처리에 실패했습니다." }, { status: 400 });
  }

  const path = `${companyId}/main_${crypto.randomUUID()}.webp`;
  const up = await supabase.storage.from(PARTNER_PORTFOLIO_BUCKET).upload(path, webp, {
    contentType: "image/webp",
    upsert: false,
  });
  if (up.error) {
    return NextResponse.json({ ok: false, error: up.error.message }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const publicUrl = `${base}/storage/v1/object/public/${PARTNER_PORTFOLIO_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;

  const { error: updError } = await supabase
    .from("partner_companies")
    .update({ main_image_url: publicUrl, updated_by: user.id })
    .eq("id", companyId);
  if (updError) {
    await supabase.storage.from(PARTNER_PORTFOLIO_BUCKET).remove([path]);
    return NextResponse.json({ ok: false, error: updError.message }, { status: 400 });
  }

  revalidatePartner(companyId);
  return NextResponse.json({ ok: true, url: publicUrl });
}
