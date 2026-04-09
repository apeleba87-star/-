/** 한국 날짜(Asia/Seoul) 기준 YYYY-MM-DD */
export function kstYmd(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** 전화번호에서 tel:용 숫자만 (국내 0 유지) */
export function digitsForTel(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d;
}

export function telHref(phone: string): string {
  const d = digitsForTel(phone);
  return d ? `tel:${d}` : "#";
}
