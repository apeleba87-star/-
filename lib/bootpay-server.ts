/**
 * 부트페이 서버 SDK 래퍼 (토큰, 영수증 검증, 빌링 결제)
 * 환경변수: BOOTPAY_APPLICATION_ID, BOOTPAY_PRIVATE_KEY
 * 외부 API 타임아웃 5초 적용 (worker block 방지)
 */

import Bootpay from "@bootpay/backend-js";

const APPLICATION_ID = process.env.BOOTPAY_APPLICATION_ID;
const PRIVATE_KEY = process.env.BOOTPAY_PRIVATE_KEY;
const MODE = (process.env.BOOTPAY_MODE as "development" | "production" | "stage") || "production";

const BOOTPAY_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Bootpay API timeout")), ms)
    ),
  ]);
}

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
  const res = await withTimeout(
    Promise.resolve(Bootpay.getAccessToken()),
    BOOTPAY_TIMEOUT_MS
  );
  return (res as { access_token: string }).access_token;
}

/** 영수증 조회로 결제 검증 (빌링키 발급/결제 완료 후) */
export async function verifyReceipt(receiptId: string): Promise<{ price: number; status: number } | null> {
  getConfig();
  await withTimeout(Promise.resolve(Bootpay.getAccessToken()), BOOTPAY_TIMEOUT_MS);
  try {
    const data = await withTimeout(
      Promise.resolve(Bootpay.receiptPayment(receiptId)),
      BOOTPAY_TIMEOUT_MS
    );
    const d = data as unknown as { price: number; status: number };
    return { price: d?.price ?? 0, status: d?.status ?? 0 };
  } catch {
    return null;
  }
}

/** 빌링키 발급 시 받은 receipt_id로 빌링키 조회 (redirect 복귀 후 사용) */
export async function lookupBillingKeyByReceipt(receiptId: string): Promise<{ billing_key: string } | null> {
  getConfig();
  await withTimeout(Promise.resolve(Bootpay.getAccessToken()), BOOTPAY_TIMEOUT_MS);
  try {
    const res = await withTimeout(
      Promise.resolve(Bootpay.lookupSubscribeBillingKey(receiptId)),
      BOOTPAY_TIMEOUT_MS
    );
    const d = res as unknown as { billing_key?: string };
    return d?.billing_key ? { billing_key: d.billing_key } : null;
  } catch {
    return null;
  }
}

const BOOTPAY_PENDING_MESSAGE = "결제대기";
const RETRY_DELAY_MS = 2800;

/** redirect 복귀 직후 PG 반영 지연 시 "결제대기 상태가 아닙니다" 오류 완화: 재시도 + 영수증 조회 폴백 */
export async function lookupBillingKeyByReceiptWithRetry(receiptId: string): Promise<
  { billing_key: string } | { error: string }
> {
  getConfig();
  await withTimeout(Promise.resolve(Bootpay.getAccessToken()), BOOTPAY_TIMEOUT_MS);

  const tryLookup = async (): Promise<{ billing_key?: string } | null> => {
    try {
      const res = await withTimeout(
        Promise.resolve(Bootpay.lookupSubscribeBillingKey(receiptId)),
        BOOTPAY_TIMEOUT_MS
      );
      const d = res as unknown as { billing_key?: string };
      return d?.billing_key ? { billing_key: d.billing_key } : null;
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
      throw new Error(msg);
    }
  };

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await tryLookup();
      if (res?.billing_key) return { billing_key: res.billing_key };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      if (!lastError.includes(BOOTPAY_PENDING_MESSAGE)) {
        return { error: lastError || "빌링키를 조회할 수 없습니다." };
      }
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  if (lastError?.includes(BOOTPAY_PENDING_MESSAGE)) {
    return {
      error:
        "카드 등록이 아직 반영 중일 수 있습니다. 10초 후 구독 페이지를 새로고침한 뒤 다시 시도해 주세요.",
    };
  }

  try {
    const receipt = await withTimeout(
      Promise.resolve(Bootpay.receiptPayment(receiptId)),
      BOOTPAY_TIMEOUT_MS
    ) as unknown as { status?: number; billing_key?: string };
    if (receipt?.status === 11 && receipt?.billing_key) {
      return { billing_key: receipt.billing_key };
    }
  } catch {
    // ignore
  }

  return {
    error: lastError || "빌링키를 조회할 수 없습니다. 결제를 다시 시도해 주세요.",
  };
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
  await withTimeout(Promise.resolve(Bootpay.getAccessToken()), BOOTPAY_TIMEOUT_MS);
  try {
    const res = await withTimeout(
      Promise.resolve(
        Bootpay.requestSubscribeCardPayment({
          billing_key: params.billing_key,
          order_id: params.order_id,
          order_name: params.order_name,
          price: params.price,
          user: params.user,
        })
      ),
      BOOTPAY_TIMEOUT_MS
    );
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
