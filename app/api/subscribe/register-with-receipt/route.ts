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
  getSubscriptionAmountCents,
  getSubscriptionFirstChargeAmount,
  getSubscriptionPromoConfig,
} from "@/lib/app-settings";

/** Vercel 등: 빌링키 재조회 지연 시 함수 실행 시간 확보 */
export const maxDuration = 60;

/** redirect 복귀 시 receipt_id(필수)와 선택적으로 billing_key로 구독 등록. 저장은 service role로 해서 세션/RLS 이슈 방지 */
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

    // PG redirect 직후 POST에서 쿠키가 비는 환경 대비: 클라이언트가 넘긴 Bearer로 동일 사용자 인증
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
        { status: 401 }
      );
    }

    let body: { receipt_id: string; billing_key?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const { receipt_id, billing_key: billingKeyFromClient } = body;
    if (!receipt_id || typeof receipt_id !== "string") {
      return NextResponse.json({ error: "receipt_id가 필요합니다." }, { status: 400 });
    }

    let billing_key: string;

    if (billingKeyFromClient && typeof billingKeyFromClient === "string" && billingKeyFromClient.trim()) {
      const verified = await verifyReceipt(receipt_id);
      if (verified && isBootpayReceiptSuccessStatus(verified.status)) {
        billing_key = billingKeyFromClient.trim();
      } else {
        // 영수증 응답 형식이 달라 verify가 실패해도, 서버에서 receipt로 빌링키를 다시 조회해 등록
        const result = await lookupBillingKeyByReceiptWithRetry(receipt_id);
        if ("error" in result) {
          return NextResponse.json(
            {
              error:
                verified && !isBootpayReceiptSuccessStatus(verified.status)
                  ? `결제 정보 검증에 실패했습니다. (상태 코드: ${verified.status})`
                  : result.error,
            },
            { status: 400 }
          );
        }
        billing_key = result.billing_key;
      }
    } else {
      const result = await lookupBillingKeyByReceiptWithRetry(receipt_id);
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      billing_key = result.billing_key;
    }
    let serviceSupabase;
    try {
      serviceSupabase = createServiceSupabase();
    } catch {
      return NextResponse.json(
        { error: "서버 설정 오류로 구독을 저장할 수 없습니다. 관리자에게 문의해 주세요." },
        { status: 503 }
      );
    }
    const normalAmount = await getSubscriptionAmountCents(serviceSupabase);
    const firstChargeAmount = await getSubscriptionFirstChargeAmount(serviceSupabase);
    const promo = await getSubscriptionPromoConfig(serviceSupabase);
    const appliedPromo =
      promo.enabled &&
      firstChargeAmount === promo.amount_cents &&
      promo.months >= 1;
    const promoRemaining = appliedPromo ? Math.max(0, promo.months - 1) : null;

    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    const { error: upsertError } = await serviceSupabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        billing_key,
        plan: "monthly",
        amount_cents: normalAmount,
        status: "active",
        next_billing_at: nextBilling.toISOString().slice(0, 10),
        last_receipt_id: receipt_id,
        updated_at: new Date().toISOString(),
        ...(promoRemaining !== null && { promo_remaining_months: promoRemaining }),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      return NextResponse.json({ error: `구독 저장 실패: ${upsertError.message}` }, { status: 500 });
    }

    await serviceSupabase.from("profiles").update({ subscription_plan: "paid", updated_at: new Date().toISOString() }).eq("id", user.id);

    return NextResponse.json({ ok: true, message: "구독이 시작되었습니다." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message || "구독 등록 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
