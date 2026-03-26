import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { refreshUserNotifications } from "@/lib/notifications/refresh-user-notifications";

/** 목록 + 미읽음 개수 (GET). 알림 갱신 삽입 (POST). */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "30", 10)));

  const { data: items, error: listErr } = await supabase
    .from("user_notifications")
    .select("id, kind, title, body, link_path, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const { count, error: countErr } = await supabase
    .from("user_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  return NextResponse.json({
    items: items ?? [],
    unreadCount: count ?? 0,
  });
}

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const result = await refreshUserNotifications(supabase, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
