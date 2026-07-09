import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    inquiry_type?: string;
    service_slug?: string | null;
    region?: string;
    phone?: string;
    message?: string;
    ref_slug?: string;
    ref_path?: string;
  };

  if (!body.inquiry_type || !body.phone?.trim()) {
    return NextResponse.json({ ok: false, error: "연락처를 입력해 주세요." }, { status: 400 });
  }
  if (body.inquiry_type !== "regular" && body.inquiry_type !== "move_in") {
    return NextResponse.json({ ok: false, error: "잘못된 문의 유형입니다." }, { status: 400 });
  }

  const service = createServiceSupabase();
  const { error } = await service.from("cleaning_inquiries").insert({
    inquiry_type: body.inquiry_type,
    service_slug: body.service_slug ?? body.ref_slug ?? null,
    region: body.region?.trim() ?? null,
    phone: body.phone.trim(),
    message: body.message?.trim() ?? null,
    ref_slug: body.ref_slug ?? null,
    ref_path: body.ref_path ?? null,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
