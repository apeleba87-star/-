import { NextRequest, NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron-auth";
import { runMoveRtmsSeoPostJob } from "@/lib/content/move-rtms-seo-post-job";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function readNumber(req: NextRequest, key: string): number | undefined {
  const value = req.nextUrl.searchParams.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest): Promise<NextResponse> {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runMoveRtmsSeoPostJob(createServiceSupabase(), {
      force: req.nextUrl.searchParams.get("force") === "true",
      autoPublish: true,
      dailyLimit: readNumber(req, "limit"),
      monthsBack: readNumber(req, "monthsBack"),
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, run_key: result.run_key }, { status: 500 });
    }

    return NextResponse.json({ ...result, auto_published: !result.skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/generate-move-rtms-seo]", message, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
