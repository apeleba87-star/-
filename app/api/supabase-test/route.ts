import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase 연동 성공",
      projectUrl: url.replace(/^https?:\/\//, "").split(".")[0],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "연결 실패";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 502 }
    );
  }
}
