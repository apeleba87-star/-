import { NextRequest, NextResponse } from "next/server";
import { getMagamRadarRegionalAdBanner } from "@/lib/demand/magam-radar-ads";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region")?.trim();
  if (!region || region === "national") {
    return NextResponse.json({ banner: null });
  }

  try {
    const banner = await getMagamRadarRegionalAdBanner(region);
    return NextResponse.json({ banner });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message, banner: null }, { status: 500 });
  }
}
