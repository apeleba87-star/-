import { NextRequest, NextResponse } from "next/server";
import { getMagamRadarRegionalAdBanner } from "@/lib/demand/magam-radar-ads";
import { magamCorsHeaders, withMagamCors } from "@/lib/api/magam-cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: magamCorsHeaders(request.headers.get("origin")),
  });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const region = req.nextUrl.searchParams.get("region")?.trim();
  if (!region || region === "national") {
    return withMagamCors(NextResponse.json({ banner: null }), origin);
  }

  try {
    const banner = await getMagamRadarRegionalAdBanner(region);
    return withMagamCors(NextResponse.json({ banner }), origin);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return withMagamCors(
      NextResponse.json({ error: message, banner: null }, { status: 500 }),
      origin
    );
  }
}
