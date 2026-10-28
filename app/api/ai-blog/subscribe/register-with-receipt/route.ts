import { createClient as createSupabaseJwtClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import {
  lookupBillingKeyByReceiptWithRetry,
  isBootpayConfigured,
  isBootpayReceiptSuccessStatus,
  verifyReceipt,
} from "@/lib/bootpay-server";
import {
  getAiBlogAmountCents,
  getAiBlogFirstChargeAmount,
} from "@/lib/ai-blog/billing-settings";
import { activateAiBlogPaidSubscription } from "@/lib/ai-blog/activate-paid";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!isBootpayConfigured()) {
      return NextResponse.json({ error: "결제가 설정되지 않았습니다." }, { status: 503 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const authSupabase = await createServerSupabase();
    let {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user && supabaseUrl && supabaseAnon) {
      const bearer = req.headers.get("authorization");
      const token = bearer?.startsWith("Bearer ") ? bearer.slice(7).trim() : "";
      if (token) {
        const jwtClient = createSupabaseJwtClient(supabaseUrl, supabaseAnon, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const got = await jwtClient.auth.getUser();
        user = got.data.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다. 구독 페이지를 새로고침한 뒤 다시 시도해 주세요." },
        { status: 401 },
      );
    }

    let body: { receipt_id: string; billing_key?: string; promo_months?: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const { receipt_id, billing_key: billingKeyFromClient, promo_months: rawMonths } = body;
    if (!receipt_id || typeof receipt_id !== "string") {
      return NextResponse.json({ error: "receipt_id가 필요합니다." }, { status: 400 });
    }

    let billing_key: string;

    if (billingKeyFromClient && typeof billingKeyFromClient === "string" && billingKeyFromClient.trim()) {
      const verified = await verifyReceipt(receipt_id);
      if (verified && isBootpayReceiptSuccessStatus(verified.status)) {
        billing_key = billingKeyFromClient.trim();
      } else {
        const result = await lookupBillingKeyByReceiptWithRetry(receipt_id);
        if ("error" in result) {
          return NextResponse.json(
            {
              error:
                verified && !isBootpayReceiptSuccessStatus(verified.status)
                  ? `결제 정보 검증에 실패했습니다. (상태 코드: ${verified.status})`
                  : result.error,
            },
            { status: 400 },
          );
        }
        billing_key = result.billing_key;
      }
    } else {
      const result = await lookupBillingKeyByReceiptWithRetry(receipt_id);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      billing_key = result.billing_key;
    }

    let serviceSupabase;
    try {
      serviceSupabase = createServiceSupabase();
    } catch {
      return NextResponse.json(
        { error: "서버 설정 오류로 구독을 저장할 수 없습니다. 관리자에게 문의해 주세요." },
        { status: 503 },
      );
    }

    const promoMonths =
      rawMonths != null && Number.isFinite(Number(rawMonths)) ? Math.round(Number(rawMonths)) : null;
    const charge = await getAiBlogFirstChargeAmount(serviceSupabase, promoMonths);
    const normalAmount = await getAiBlogAmountCents(serviceSupabase);

    const result = await activateAiBlogPaidSubscription(serviceSupabase, {
      userId: user.id,
      billingKey: billing_key,
      receiptId: receipt_id,
      amountCents: normalAmount,
      promoMonths: charge.appliedPromo ? charge.promoMonths : 0,
      actorId: user.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "AI 블로그 구독이 시작되었습니다.",
      next_billing_at: result.nextBillingAt,
    });
  } catch (e) {
    console.error("[ai-blog subscribe register-with-receipt]", e);
    return NextResponse.json({ error: "구독 등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}
