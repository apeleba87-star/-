import { NextResponse } from "next/server";

import { readMagamPwaRuntimeConfig } from "@/lib/magam/pwa-runtime-config";

export function GET() {
  const config = readMagamPwaRuntimeConfig();
  if (!config) {
    return NextResponse.json({ error: "Supabase env not configured" }, { status: 503 });
  }
  return NextResponse.json(config, {
    headers: { "Cache-Control": "no-store" },
  });
}
