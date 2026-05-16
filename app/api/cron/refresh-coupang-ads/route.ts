import { NextRequest, NextResponse } from "next/server";
import { refreshAllCoupangAdSlots } from "@/lib/coupang-partners/refresh";

export const dynamic = "force-dynamic";

/** 쿠팡 파트너스 API 슬롯 캐시 갱신 (30~60분마다 권장) */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await refreshAllCoupangAdSlots();
    const ok = results.filter((r) => r.ok).length;
    return NextResponse.json({ ok: true, refreshed: ok, total: results.length, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
