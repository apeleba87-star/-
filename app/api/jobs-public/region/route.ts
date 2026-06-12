import { NextRequest, NextResponse } from "next/server";
import {
  JOB_PUBLIC_REGION_COOKIE,
  preferenceFromScope,
} from "@/lib/jobs-public/region-preference-shared";
import {
  jobPublicScopeFromDraft,
  parseJobPublicRegionCookie,
  serializeJobPublicRegionDraft,
  type JobPublicRegionDraft,
} from "@/lib/jobs-public/job-region-scope";

function parseBodyDraft(body: Record<string, unknown>): JobPublicRegionDraft | null {
  if (body.scope === "national") return { scope: "national" };
  if (body.scope === "city" && typeof body.cityId === "string") {
    return { scope: "city", cityId: body.cityId };
  }
  if (
    body.scope === "district" &&
    typeof body.cityId === "string" &&
    typeof body.guSlug === "string"
  ) {
    return { scope: "district", cityId: body.cityId, guSlug: body.guSlug };
  }
  if (typeof body.sido === "string") {
    const legacy = parseJobPublicRegionCookie(
      JSON.stringify({
        sido: body.sido,
        sigungu: typeof body.sigungu === "string" ? body.sigungu : null,
      })
    );
    return legacy;
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const draft = parseBodyDraft(body);
  if (!draft) {
    return NextResponse.json({ ok: false, error: "Invalid region" }, { status: 400 });
  }

  const scope = jobPublicScopeFromDraft(draft);
  const pref = preferenceFromScope(scope);
  const res = NextResponse.json({ ok: true, label: pref.label });
  res.cookies.set(JOB_PUBLIC_REGION_COOKIE, serializeJobPublicRegionDraft(draft), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
  return res;
}
