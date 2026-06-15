import { NextRequest, NextResponse } from "next/server";
import { getMagamRadarNationalAdBanner } from "@/lib/demand/magam-radar-ads";
import { magamCorsHeaders, withMagamCors } from "@/lib/api/magam-cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: magamCorsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const banner = await getMagamRadarNationalAdBanner();
    return withMagamCors(NextResponse.json({ banner }), origin);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return withMagamCors(
      NextResponse.json({ error: message, banner: null }, { status: 500 }),
      origin
    );
  }
}
