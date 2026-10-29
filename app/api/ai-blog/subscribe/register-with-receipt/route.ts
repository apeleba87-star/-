import { createClient as createSupabaseJwtClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { isBootpayConfigured } from "@/lib/bootpay-server";
import {
  getAiBlogAmountCents,
  getAiBlogFirstChargeAmount,
} from "@/lib/ai-blog/billing-settings";
import { activateAiBlogPaidSubscription } from "@/lib/ai-blog/activate-paid";
import {
  assertReceiptNotUsedByOther,
  resolveVerifiedAiBlogBilling,
} from "@/lib/ai-blog/subscribe-guard";

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

    const receiptId = typeof body.receipt_id === "string" ? body.receipt_id.trim() : "";
    if (!receiptId) {
      return NextResponse.json({ error: "receipt_id가 필요합니다." }, { status: 400 });
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
      body.promo_months != null && Number.isFinite(Number(body.promo_months))
        ? Math.round(Number(body.promo_months))
        : null;
    const charge = await getAiBlogFirstChargeAmount(serviceSupabase, promoMonths);
    const normalAmount = await getAiBlogAmountCents(serviceSupabase);

    const reused = await assertReceiptNotUsedByOther(serviceSupabase, receiptId, user.id);
    if (!reused.ok) {
      return NextResponse.json({ error: reused.error }, { status: 400 });
    }

    const verified = await resolveVerifiedAiBlogBilling({
      receiptId,
      expectedPriceCents: charge.amountCents,
      billingKeyHint: typeof body.billing_key === "string" ? body.billing_key : null,
    });
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }

    const result = await activateAiBlogPaidSubscription(serviceSupabase, {
      userId: user.id,
      billingKey: verified.billingKey,
      receiptId,
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
