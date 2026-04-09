import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { PARTNER_PORTFOLIO_BUCKET, PARTNER_PORTFOLIO_MAX_ITEMS } from "@/lib/partners/portfolio-constants";
import { makePartnerPortfolioVariants, PORTFOLIO_ALLOWED_MIME } from "@/lib/partners/process-portfolio-image";
import { portfolioItemTitleForUpload } from "@/lib/partners/portfolio-upload-title";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

function revalidatePartnerPaths(companyId: string) {
  revalidatePath("/partners");
  revalidatePath(`/partners/${companyId}`);
  revalidatePath("/partners/performance");
  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${companyId}/portfolio`);
  revalidatePath(`/admin/partners/${companyId}/edit`);
}

type Failure = { name: string; error: string };

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "요청 본문을 읽지 못했습니다. 여러 장을 한 번에 올릴 때 용량이 크면 실패할 수 있으니, 장수를 줄이거나 나누어 업로드해 주세요.",
      },
      { status: 413 }
    );
  }

  const companyId = String(form.get("company_id") ?? "").trim();
  const titleRaw = String(form.get("title") ?? "").trim();
  const fileParts = form.getAll("file").filter((x): x is File => x instanceof File);

  if (!companyId) {
    return NextResponse.json({ ok: false, error: "company_id가 필요합니다." }, { status: 400 });
  }
  if (fileParts.length === 0) {
    return NextResponse.json({ ok: false, error: "이미지 파일을 선택해 주세요." }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  const isStaff = role === "admin" || role === "editor";

  if (!isStaff) {
    const { data: own } = await supabase
      .from("partner_companies")
      .select("id")
      .eq("id", companyId)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (!own) {
      return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
    }
  }

  const { count, error: countError } = await supabase
    .from("partner_company_portfolio_items")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (countError) {
    return NextResponse.json({ ok: false, error: countError.message }, { status: 400 });
  }

  const currentCount = count ?? 0;
  const remainingSlots = PARTNER_PORTFOLIO_MAX_ITEMS - currentCount;
  if (remainingSlots <= 0) {
    return NextResponse.json(
      { ok: false, error: `사진은 최대 ${PARTNER_PORTFOLIO_MAX_ITEMS}장까지 등록할 수 있습니다.`, added: 0 },
      { status: 400 }
    );
  }

  const skippedLimit = Math.max(0, fileParts.length - remainingSlots);
  const toProcess = fileParts.slice(0, remainingSlots);

  const { data: maxRow } = await supabase
    .from("partner_company_portfolio_items")
    .select("sort_order")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextSort = ((maxRow as { sort_order?: number } | null)?.sort_order ?? 0) + 10;
  const failures: Failure[] = [];
  let added = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const file = toProcess[i];
    const itemTitle = portfolioItemTitleForUpload(file.name, i, toProcess.length, titleRaw);

    if (!PORTFOLIO_ALLOWED_MIME.has(file.type)) {
      failures.push({ name: file.name, error: "JPG, PNG, WebP, GIF만 업로드할 수 있습니다." });
      continue;
    }
    if (file.size > MAX_BYTES) {
      failures.push({ name: file.name, error: "파일 크기는 8MB 이하여야 합니다." });
      continue;
    }

    let buf: Buffer;
    try {
      buf = Buffer.from(await file.arrayBuffer());
    } catch {
      failures.push({ name: file.name, error: "파일을 읽을 수 없습니다." });
      continue;
    }

    let thumb: Buffer;
    let display: Buffer;
    try {
      const out = await makePartnerPortfolioVariants(buf);
      thumb = out.thumb;
      display = out.display;
    } catch {
      failures.push({ name: file.name, error: "이미지 처리에 실패했습니다." });
      continue;
    }

    const itemId = crypto.randomUUID();
    const thumbPath = `${companyId}/${itemId}_thumb.webp`;
    const displayPath = `${companyId}/${itemId}_display.webp`;

    const upThumb = await supabase.storage.from(PARTNER_PORTFOLIO_BUCKET).upload(thumbPath, thumb, {
      contentType: "image/webp",
      upsert: false,
    });
    if (upThumb.error) {
      failures.push({ name: file.name, error: upThumb.error.message });
      continue;
    }

    const upDisp = await supabase.storage.from(PARTNER_PORTFOLIO_BUCKET).upload(displayPath, display, {
      contentType: "image/webp",
      upsert: false,
    });
    if (upDisp.error) {
      await supabase.storage.from(PARTNER_PORTFOLIO_BUCKET).remove([thumbPath]);
      failures.push({ name: file.name, error: upDisp.error.message });
      continue;
    }

    const { error: insError } = await supabase.from("partner_company_portfolio_items").insert({
      id: itemId,
      company_id: companyId,
      title: itemTitle || "작업 사례",
      caption: null,
      image_path_thumb: thumbPath,
      image_path_display: displayPath,
      external_image_url: null,
      sort_order: nextSort,
    });

    if (insError) {
      await supabase.storage.from(PARTNER_PORTFOLIO_BUCKET).remove([thumbPath, displayPath]);
      failures.push({ name: file.name, error: insError.message });
      continue;
    }

    nextSort += 10;
    added += 1;
  }

  if (added === 0) {
    const firstErr = failures[0]?.error ?? (skippedLimit > 0 ? `최대 ${PARTNER_PORTFOLIO_MAX_ITEMS}장까지 등록할 수 있습니다.` : "업로드에 실패했습니다.");
    return NextResponse.json(
      {
        ok: false,
        error: firstErr,
        added: 0,
        failures,
        skipped_limit: skippedLimit,
      },
      { status: 400 }
    );
  }

  revalidatePartnerPaths(companyId);

  return NextResponse.json({
    ok: true,
    added,
    failures,
    skipped_limit: skippedLimit,
    partial: failures.length > 0 || skippedLimit > 0,
  });
}
