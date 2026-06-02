import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  getSearchAdCredentialsStatus,
  testSearchAdConnection,
} from "@/lib/naver/searchad-keyword-client";

export const dynamic = "force-dynamic";

async function requireAdminEditor() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const };
}

export async function GET() {
  const gate = await requireAdminEditor();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  const status = getSearchAdCredentialsStatus();
  if (!status.configured) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error:
        "NAVER_SEARCHAD_API_KEY, NAVER_SEARCHAD_SECRET_KEY, NAVER_SEARCHAD_CUSTOMER_ID 가 설정되지 않았습니다.",
    });
  }

  const test = await testSearchAdConnection();
  return NextResponse.json({
    configured: true,
    customerId: status.customerId,
    ...test,
  });
}
