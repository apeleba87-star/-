import { NextRequest, NextResponse } from "next/server";
import { getMagamRadarNationalAdBanner } from "@/lib/demand/magam-radar-ads";
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

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const banner = await getMagamRadarNationalAdBanner();
    return cachedBannerResponse({ banner }, origin);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return withMagamCors(
      NextResponse.json({ error: "광고를 불러오지 못했습니다.", banner: null }, { status: 500 }),
      origin
    );
  }
}
