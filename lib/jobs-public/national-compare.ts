import { formatDeltaMan } from "@/lib/jobs-public-ingest/worknet/pay-normalize";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";

/** 지역 1위 vs 전국 1위 — 월 환산 기준 */
export function formatNationalPayCompareNote(
  localTop: PublicJobOpeningListItem | null,
  nationalTop: PublicJobOpeningListItem | null
): string | null {
  if (!localTop || !nationalTop || localTop.id === nationalTop.id) return null;
  const localPay = localTop.pay_monthly_normalized ?? 0;
  const nationalPay = nationalTop.pay_monthly_normalized ?? 0;
  if (nationalPay <= localPay || nationalPay <= 0) return null;
  return `전국 최고보다 ${formatDeltaMan(nationalPay - localPay)} 낮음`;
}
