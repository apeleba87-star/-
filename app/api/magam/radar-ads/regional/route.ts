import { NextRequest, NextResponse } from "next/server";
import { getMagamRadarRegionalAdBanner } from "@/lib/demand/magam-radar-ads";
import { magamCorsHeaders, withMagamCors } from "@/lib/api/magam-cors";

export const dynamic = "force-dynamic";

const RADAR_AD_CACHE = "public, s-maxage=120, stale-while-revalidate=300";

function cachedBannerResponse(body: object, origin: string | null): Response {
  const res = NextResponse.json(body);
  res.headers.set("Cache-Control", RADAR_AD_CACHE);
  return withMagamCors(res, origin);
}

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
    return cachedBannerResponse({ banner: null }, origin);
  }

  try {
    const banner = await getMagamRadarRegionalAdBanner(region);
    return cachedBannerResponse({ banner }, origin);
  } catch {
    return withMagamCors(
      NextResponse.json({ error: "광고를 불러오지 못했습니다.", banner: null }, { status: 500 }),
      origin
    );
  }
}
