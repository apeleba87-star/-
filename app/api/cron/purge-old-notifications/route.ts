import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { verifyCronSecret } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 읽은 알림 보관 일수 */
const DEFAULT_READ_RETENTION_DAYS = 7;
/** 안 읽은 알림 보관 일수 */
const DEFAULT_UNREAD_RETENTION_DAYS = 30;

function parseDays(raw: string | null, fallback: number, max = 365) {
  const n = Number(raw ?? "");
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.floor(n));
}

async function handle(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const dryRun = sp.get("dry_run") === "1";
  const readDays = parseDays(sp.get("read_days"), DEFAULT_READ_RETENTION_DAYS);
  const unreadDays = parseDays(sp.get("unread_days"), DEFAULT_UNREAD_RETENTION_DAYS);

  const readCutoff = new Date(Date.now() - readDays * 24 * 60 * 60 * 1000).toISOString();
  const unreadCutoff = new Date(Date.now() - unreadDays * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createServiceSupabase();

  if (dryRun) {
    const [readCount, unreadCount] = await Promise.all([
      supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .not("read_at", "is", null)
        .lt("created_at", readCutoff),
      supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .lt("created_at", unreadCutoff),
    ]);

    if (readCount.error || unreadCount.error) {
      return NextResponse.json(
        { ok: false, error: readCount.error?.message ?? unreadCount.error?.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      dry_run: true,
      read_retention_days: readDays,
      unread_retention_days: unreadDays,
      read_cutoff: readCutoff,
      unread_cutoff: unreadCutoff,
      would_delete_read: readCount.count ?? 0,
      would_delete_unread: unreadCount.count ?? 0,
    });
  }

  const [readDel, unreadDel] = await Promise.all([
    supabase
      .from("user_notifications")
      .delete({ count: "exact" })
      .not("read_at", "is", null)
      .lt("created_at", readCutoff),
    supabase
      .from("user_notifications")
      .delete({ count: "exact" })
      .is("read_at", null)
      .lt("created_at", unreadCutoff),
  ]);

  if (readDel.error || unreadDel.error) {
    return NextResponse.json(
      { ok: false, error: readDel.error?.message ?? unreadDel.error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    read_retention_days: readDays,
    unread_retention_days: unreadDays,
    read_cutoff: readCutoff,
    unread_cutoff: unreadCutoff,
    deleted_read: readDel.count ?? 0,
    deleted_unread: unreadDel.count ?? 0,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
