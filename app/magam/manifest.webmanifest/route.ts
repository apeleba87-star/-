import { NextResponse } from "next/server";

import { magamWebManifest } from "@/lib/magam/pwa-manifest";

export function GET() {
  return NextResponse.json(magamWebManifest(), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
