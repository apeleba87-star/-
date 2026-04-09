import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  }

  let body: { company_id?: string };
  try {
    body = (await req.json()) as { company_id?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const companyId = body.company_id?.trim() ?? "";
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "company_id가 필요합니다." }, { status: 400 });
  }

  const { data: company } = await supabase
    .from("partner_companies")
    .select("id")
    .eq("id", companyId)
    .eq("status", "active")
    .maybeSingle();
  if (!company) {
    return NextResponse.json({ ok: false, error: "업체를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("partner_company_favorites")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("partner_company_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("company_id", companyId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    revalidatePath(`/partners/${companyId}`);
    return NextResponse.json({ ok: true, favorited: false });
  }

  const { error } = await supabase.from("partner_company_favorites").insert({
    user_id: user.id,
    company_id: companyId,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  revalidatePath(`/partners/${companyId}`);
  return NextResponse.json({ ok: true, favorited: true });
}
