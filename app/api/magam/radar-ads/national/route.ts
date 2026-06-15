import { NextResponse } from "next/server";
import { getMagamRadarNationalAdBanner } from "@/lib/demand/magam-radar-ads";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const banner = await getMagamRadarNationalAdBanner();
    return NextResponse.json({ banner });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message, banner: null }, { status: 500 });
  }
}
