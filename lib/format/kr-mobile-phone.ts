/** 숫자만 (국내 0 유지) */
export function krMobileDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** 010-XXXX-XXXX (11자리) / 010-XXX-XXXX (10자리) */
export function formatKrMobilePhone(phone: string): string {
  const digits = krMobileDigits(phone).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function telHref(phone: string): string {
  const d = krMobileDigits(phone);
  return d ? `tel:${d}` : "#";
}
