import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { magamCorsHeaders, withMagamCors } from "@/lib/api/magam-cors";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...magamCorsHeaders(request.headers.get("origin")),
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/** 마감링크 앱 — 본인 계정 삭제 (Play / App Store 계정 삭제 요건) */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return withMagamCors(
        NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 }),
        origin
      );
    }

    const accessToken = authHeader.slice("Bearer ".length).trim();
    if (!accessToken) {
      return withMagamCors(
        NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 }),
        origin
      );
    }

    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return withMagamCors(
        NextResponse.json({ ok: false, error: "세션이 만료되었습니다. 다시 로그인해 주세요." }, { status: 401 }),
        origin
      );
    }

    const service = createServiceSupabase();
    const { error: deleteError } = await service.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return withMagamCors(
        NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 }),
        origin
      );
    }

    return withMagamCors(NextResponse.json({ ok: true }), origin);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return withMagamCors(
      NextResponse.json({ ok: false, error: message }, { status: 500 }),
      origin
    );
  }
}
