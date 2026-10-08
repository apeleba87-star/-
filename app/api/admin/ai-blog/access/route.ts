import { NextRequest, NextResponse } from "next/server";
import { applyAccessChange, loadAccessLogs, type AccessAction } from "@/lib/ai-blog/admin-access";
import { cleanText, isUuid, jsonError, nullableInt, nullableText, requireSiteAdmin } from "@/lib/ai-blog/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 사이트 관리자: 사용자별 권한 변경 기록 */
export async function GET(req: NextRequest) {
  const guard = await requireSiteAdmin();
  if (!guard.ok) return guard.response;
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!isUuid(userId)) return jsonError("user_not_found");
  return NextResponse.json({ ok: true, data: await loadAccessLogs(userId) });
}

/** 사이트 관리자: AI 블로그 권한 부여·연장·만료일 지정·요금제 변경·정지·해제 */
export async function POST(req: NextRequest) {
  const guard = await requireSiteAdmin();
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("invalid_json_body");
  }

  const action = cleanText(body.action, 20);
  let change: AccessAction;
  switch (action) {
    case "extend":
      change = { action, months: Number(body.months) };
      break;
    case "set_expiry":
      change = { action, expires_on: cleanText(body.expires_on, 10) };
      break;
    case "change_plan":
      change = { action, plan_code: cleanText(body.plan_code, 50) };
      break;
    case "suspend":
    case "resume":
      change = { action };
      break;
    default:
      return jsonError("invalid_action");
  }

  const userId = isUuid(body.user_id) ? body.user_id : undefined;
  const email = cleanText(body.email, 200) || undefined;
  if (!userId && !email) return jsonError("user_not_found");

  const result = await applyAccessChange({
    ...change,
    userId,
    email,
    planCode: cleanText(body.plan_code, 50) || undefined,
    amountKrw: nullableInt(body.amount_krw, 0, 100_000_000),
    payerName: nullableText(body.payer_name, 50),
    memo: nullableText(body.memo, 500),
    actorId: guard.userId,
  });
  if (!result.ok) return jsonError(result.error);
  return NextResponse.json({ ok: true });
}
