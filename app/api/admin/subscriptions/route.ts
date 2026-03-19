import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/** 관리자: 구독 목록 (status, next_billing_at, 이메일). service role로 조회 */
export async function GET(req: Request) {
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await authSupabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status"); // active | cancelled | past_due
  const cancelScheduledOnly = searchParams.get("filter") === "cancel_scheduled"; // cancelled && next_billing_at > today

  const supabase = createServiceSupabase();
  const today = new Date().toISOString().slice(0, 10);

  let q = supabase
    .from("subscriptions")
    .select("id, user_id, status, next_billing_at, amount_cents, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (statusFilter && ["active", "cancelled", "past_due"].includes(statusFilter)) {
    q = q.eq("status", statusFilter);
  }
  if (cancelScheduledOnly) {
    q = q.eq("status", "cancelled").gt("next_billing_at", today);
  }

  const { data: subs, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", userIds);
  const emailById = new Map((profiles ?? []).map((p) => [p.id, (p as { email?: string }).email]));

  const list = (subs ?? []).map((s) => ({
    ...s,
    email: emailById.get(s.user_id) ?? null,
  }));

  return NextResponse.json({ data: list });
}
