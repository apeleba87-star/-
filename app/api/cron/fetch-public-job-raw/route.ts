import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/** @deprecated 서울 열린데이터 수집 중단. 워크넷은 `/api/cron/sync-worknet-jobs` 사용 */
async function handle(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    skipped: true,
    reason: "서울 열린데이터 GetJobInfo 수집은 중단되었습니다. /api/cron/sync-worknet-jobs 를 사용하세요.",
  });
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handle();
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handle();
}
