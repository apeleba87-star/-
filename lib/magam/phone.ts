import { formatKrMobilePhone, krMobileDigits } from "@/lib/format/kr-mobile-phone";

/** DB 저장용 — 숫자만 */
export function normalizeMagamPhone(phone: string): string {
  return krMobileDigits(phone);
}

/** 입력 필드 표시용 */
export function formatMagamPhoneInput(phone: string): string {
  return formatKrMobilePhone(phone);
}
