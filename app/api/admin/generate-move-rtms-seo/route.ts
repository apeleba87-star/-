import { NextRequest, NextResponse } from "next/server";

import { runMoveRtmsSeoPostJob } from "@/lib/content/move-rtms-seo-post-job";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function readNumber(url: URL, key: string): number | undefined {
  const value = url.searchParams.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await createServerSupabase();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin" && profile?.role !== "editor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url ?? "", "http://localhost");
    const force = url.searchParams.get("force") === "true";
    const autoPublish = url.searchParams.get("draft") !== "true";
    const dryRun = url.searchParams.get("dryRun") === "true";
    const supabase = createServiceSupabase();
    const result = await runMoveRtmsSeoPostJob(supabase, {
      force,
      autoPublish,
      dryRun,
      dailyLimit: readNumber(url, "limit"),
      monthsBack: readNumber(url, "monthsBack"),
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, run_key: result.run_key }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
