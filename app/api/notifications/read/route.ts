import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/** { "all": true } 또는 { "ids": ["uuid", ...] } */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { all?: boolean; ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (body.all === true) {
    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string").slice(0, 100) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids 또는 all이 필요합니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: now })
    .eq("user_id", user.id)
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
