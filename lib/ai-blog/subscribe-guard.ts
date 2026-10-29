import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isBootpayReceiptSuccessStatus,
  lookupBillingKeyByReceiptWithRetry,
  verifyReceipt,
} from "@/lib/bootpay-server";

/**
 * Bootpay 영수증·빌링키 검증.
 * - receipt 필수
 * - 성공 status만 허용
 * - billing_key는 Bootpay 조회 결과를 우선 (클라이언트 값은 보조)
 * - price>0 이면 서버 청구액과 일치해야 함
 */
export async function resolveVerifiedAiBlogBilling(args: {
  receiptId: string;
  expectedPriceCents: number;
  billingKeyHint?: string | null;
}): Promise<
  | { ok: true; billingKey: string; receiptPrice: number }
  | { ok: false; error: string; status?: number }
> {
  const receiptId = args.receiptId.trim();
  if (!receiptId) return { ok: false, error: "receipt_id가 필요합니다." };

  const verified = await verifyReceipt(receiptId);
  if (!verified || !isBootpayReceiptSuccessStatus(verified.status)) {
    return {
      ok: false,
      error: verified
        ? `결제 정보 검증에 실패했습니다. (상태 코드: ${verified.status})`
        : "결제 정보 검증에 실패했습니다.",
      status: verified?.status,
    };
  }

  if (verified.price > 0 && Math.round(verified.price) !== Math.round(args.expectedPriceCents)) {
    return {
      ok: false,
      error: `결제 금액이 일치하지 않습니다. (영수증 ${Math.round(verified.price)}원 / 예상 ${Math.round(args.expectedPriceCents)}원)`,
    };
  }

  let billingKey: string | null =
    typeof verified.billing_key === "string" && verified.billing_key.trim()
      ? verified.billing_key.trim()
      : null;

  if (!billingKey) {
    const looked = await lookupBillingKeyByReceiptWithRetry(receiptId);
    if ("error" in looked) return { ok: false, error: looked.error };
    billingKey = looked.billing_key;
  }

  if (!billingKey) {
    return { ok: false, error: "빌링키를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  // 클라이언트가 보낸 키가 있으면 Bootpay 결과와 반드시 일치
  const hint = args.billingKeyHint?.trim();
  if (hint && hint !== billingKey) {
    return { ok: false, error: "빌링키 검증에 실패했습니다. 다시 결제해 주세요." };
  }

  return { ok: true, billingKey, receiptPrice: verified.price };
}

/** 동일 receipt_id가 다른 계정에 이미 쓰였는지 */
export async function assertReceiptNotUsedByOther(
  supabase: SupabaseClient,
  receiptId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data } = await supabase
    .from("ai_blog_subscriptions")
    .select("user_id")
    .eq("last_receipt_id", receiptId)
    .maybeSingle<{ user_id: string }>();
  if (data?.user_id && data.user_id !== userId) {
    return { ok: false, error: "이미 사용된 결제 정보입니다." };
  }
  return { ok: true };
}
