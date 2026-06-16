import { NextResponse } from "next/server";

import { siteWebManifest } from "@/lib/site/pwa-manifest";

export function GET() {
  return NextResponse.json(siteWebManifest(), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
