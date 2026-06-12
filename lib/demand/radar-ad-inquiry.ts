import {
  RADAR_AD_SLOT_CATEGORY_LABELS,
  type RadarAdSlotCategory,
} from "@/lib/demand/radar-ads-shared";

export type RadarAdInquiryScope = "national" | "regional" | "both";

export type RadarAdInquiryStatus = "new" | "contacted" | "won" | "lost";

export type RadarAdInquiryPayload = {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  scope: RadarAdInquiryScope;
  regionInterest: string;
  category: RadarAdSlotCategory | "";
  message: string;
  consentPersonal: boolean;
  /** 봇 방지 — 비어 있어야 함 */
  website: string;
};

const SCOPES: RadarAdInquiryScope[] = ["national", "regional", "both"];
const CATEGORIES = Object.keys(RADAR_AD_SLOT_CATEGORY_LABELS) as RadarAdSlotCategory[];

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function isValidKrPhoneForInquiry(phone: string): boolean {
  const d = digitsOnly(phone);
  return d.length >= 10 && d.length <= 11 && /^01/.test(d);
}

export function parseAndValidateRadarAdInquiry(
  body: unknown
): { ok: true; data: RadarAdInquiryPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.website === "string" && b.website.trim()) {
    return { ok: false, error: "잘못된 요청입니다." };
  }

  const companyName = String(b.company_name ?? b.companyName ?? "").trim();
  const contactName = String(b.contact_name ?? b.contactName ?? "").trim();
  const phone = String(b.phone ?? "").trim();
  const email = String(b.email ?? "").trim();
  const scope = String(b.scope ?? "").trim() as RadarAdInquiryScope;
  const regionInterest = String(b.region_interest ?? b.regionInterest ?? "").trim();
  const categoryRaw = String(b.category ?? "").trim();
  const message = String(b.message ?? "").trim();
  const consentPersonal = b.consent_personal === true || b.consentPersonal === true;

  if (!companyName) return { ok: false, error: "업체명을 입력해 주세요." };
  if (!contactName) return { ok: false, error: "담당자명을 입력해 주세요." };
  if (!isValidKrPhoneForInquiry(phone)) {
    return { ok: false, error: "연락 가능한 휴대폰 번호를 입력해 주세요." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "이메일 형식을 확인해 주세요." };
  }
  if (!SCOPES.includes(scope)) {
    return { ok: false, error: "희망 광고 유형을 선택해 주세요." };
  }
  if ((scope === "regional" || scope === "both") && regionInterest.length < 2) {
    return { ok: false, error: "희망 지역(시·구)을 입력해 주세요." };
  }
  if (categoryRaw && !CATEGORIES.includes(categoryRaw as RadarAdSlotCategory)) {
    return { ok: false, error: "업종을 확인해 주세요." };
  }
  if (message.length > 2000) {
    return { ok: false, error: "문의 내용은 2000자 이내로 입력해 주세요." };
  }
  if (!consentPersonal) {
    return { ok: false, error: "개인정보 수집·이용에 동의해 주세요." };
  }

  return {
    ok: true,
    data: {
      companyName,
      contactName,
      phone: digitsOnly(phone),
      email,
      scope,
      regionInterest,
      category: (categoryRaw as RadarAdSlotCategory) || "",
      message,
      consentPersonal,
      website: "",
    },
  };
}

export function radarAdInquiryScopeLabel(scope: RadarAdInquiryScope): string {
  switch (scope) {
    case "national":
      return "전국";
    case "regional":
      return "지역";
    case "both":
      return "전국 + 지역";
  }
}

export const RADAR_AD_INQUIRY_STATUS_LABELS: Record<RadarAdInquiryStatus, string> = {
  new: "신규",
  contacted: "연락함",
  won: "계약",
  lost: "종료",
};
