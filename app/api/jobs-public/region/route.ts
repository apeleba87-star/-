import { NextRequest, NextResponse } from "next/server";
import {
  JOB_PUBLIC_REGION_COOKIE,
  preferenceFromScope,
  serializeRegionPreference,
} from "@/lib/jobs-public/region-preference";

export async function POST(req: NextRequest) {
  let body: { sido?: string; sigungu?: string | null };
  try {
    body = (await req.json()) as { sido?: string; sigungu?: string | null };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const sido = (body.sido ?? "서울").trim();
  if (!sido) {
    return NextResponse.json({ ok: false, error: "sido required" }, { status: 400 });
  }
  const pref = preferenceFromScope({
    sido,
    sigungu: body.sigungu?.trim() || null,
  });
  const res = NextResponse.json({ ok: true, label: pref.label });
  res.cookies.set(JOB_PUBLIC_REGION_COOKIE, serializeRegionPreference(pref), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
  return res;
}
