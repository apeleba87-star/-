export type RadarAdCtaMode = "link" | "phone";

export function radarAdCtaModeFromUrl(url: string): RadarAdCtaMode {
  return url.trim().startsWith("tel:") ? "phone" : "link";
}

export function radarAdPhoneDigitsFromUrl(url: string): string {
  if (!url.trim().startsWith("tel:")) return "";
  return url.trim().slice(4).replace(/\D/g, "");
}

export function radarAdLinkValueFromUrl(url: string): string {
  const v = url.trim();
  if (!v || v.startsWith("tel:")) return "";
  return v;
}

export function formatPhoneInputDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function buildRadarAdCtaUrl(mode: RadarAdCtaMode, value: string): string {
  if (mode === "phone") {
    const digits = value.replace(/\D/g, "");
    return digits ? `tel:${digits}` : "";
  }
  const v = value.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v) || v.startsWith("/") || v.startsWith("mailto:")) return v;
  return `https://${v}`;
}

export function validateRadarAdCtaUrl(url: string): string | null {
  const v = url.trim();
  if (!v) return "링크 또는 전화번호를 입력하세요.";

  if (v.startsWith("tel:")) {
    const digits = v.slice(4).replace(/\D/g, "");
    if (digits.length < 8) return "전화번호는 8자리 이상 입력하세요.";
    return null;
  }

  if (!/^https?:\/\//i.test(v) && !v.startsWith("/")) {
    return "http:// 또는 https:// 로 시작하는 주소를 입력하세요.";
  }
  return null;
}
