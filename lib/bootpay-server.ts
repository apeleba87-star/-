/**
 * 부트페이 서버 SDK 래퍼 (토큰, 영수증 검증, 빌링 결제)
 * 환경변수: BOOTPAY_APPLICATION_ID, BOOTPAY_PRIVATE_KEY
 */

import Bootpay from "@bootpay/backend-js";

const APPLICATION_ID = process.env.BOOTPAY_APPLICATION_ID;
const PRIVATE_KEY = process.env.BOOTPAY_PRIVATE_KEY;
const MODE = (process.env.BOOTPAY_MODE as "development" | "production" | "stage") || "production";

function getConfig() {
  if (!APPLICATION_ID || !PRIVATE_KEY) {
    throw new Error("BOOTPAY_APPLICATION_ID and BOOTPAY_PRIVATE_KEY are required");
  }
  Bootpay.setConfiguration({
    application_id: APPLICATION_ID,
    private_key: PRIVATE_KEY,
    mode: MODE,
  });
}

export async function getBootpayToken(): Promise<string> {
  getConfig();
  const res = await Bootpay.getAccessToken();
  return (res as { access_token: string }).access_token;
}

/** 영수증 조회로 결제 검증 (빌링키 발급/결제 완료 후) */
export async function verifyReceipt(receiptId: string): Promise<{ price: number; status: number } | null> {
  getConfig();
  await Bootpay.getAccessToken();
  try {
    const data = await Bootpay.receiptPayment(receiptId);
    const d = data as unknown as { price: number; status: number };
    return { price: d?.price ?? 0, status: d?.status ?? 0 };
  } catch {
    return null;
  }
}

/** 빌링키 발급 시 받은 receipt_id로 빌링키 조회 (redirect 복귀 후 사용) */
export async function lookupBillingKeyByReceipt(receiptId: string): Promise<{ billing_key: string } | null> {
  getConfig();
  await Bootpay.getAccessToken();
  try {
    const res = await Bootpay.lookupSubscribeBillingKey(receiptId);
    const d = res as unknown as { billing_key?: string };
    return d?.billing_key ? { billing_key: d.billing_key } : null;
  } catch {
    return null;
  }
}

/** 빌링키로 결제 요청 (구독 갱신 시 서버에서 호출) */
export async function requestBillingPayment(params: {
  billing_key: string;
  order_id: string;
  order_name: string;
  price: number;
  user?: { username?: string; phone?: string; email?: string };
}): Promise<{ success: boolean; receipt_id?: string; status?: number; error?: string }> {
  getConfig();
  await Bootpay.getAccessToken();
  try {
    const res = await Bootpay.requestSubscribeCardPayment({
      billing_key: params.billing_key,
      order_id: params.order_id,
      order_name: params.order_name,
      price: params.price,
      user: params.user,
    });
    const data = res as unknown as { receipt_id?: string; status?: number };
    return { success: true, receipt_id: data?.receipt_id, status: data?.status };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export function isBootpayConfigured(): boolean {
  return !!(APPLICATION_ID && PRIVATE_KEY);
}
