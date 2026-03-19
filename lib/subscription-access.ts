/**
 * 구독 접근 권한: active 이거나, cancelled 이더라도 next_billing_at 전일까지는 이용 가능.
 * next_billing_at 당일부터는 재결제 없으므로 접근 불가.
 */
export function hasSubscriptionAccess(
  sub: { status?: string; next_billing_at?: string | null } | null,
  todayYmd: string
): boolean {
  if (!sub || !sub.status) return false;
  if (sub.status === "active") return true;
  if (
    sub.status === "cancelled" &&
    sub.next_billing_at &&
    todayYmd < sub.next_billing_at
  ) {
    return true;
  }
  return false;
}
