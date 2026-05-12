/** 베타 테스터 지원 폼 — 선택지 및 서버 검증용 상수 */

export const BETA_INDUSTRY_OPTIONS = [
  "청소업",
  "시설관리",
  "무인매장 관리",
  "정기관리업",
  "출장 서비스업",
  "하도급 현장업",
  "기타",
] as const;

export const BETA_EMPLOYEE_BAND_OPTIONS = [
  "1인 운영",
  "2~5명",
  "5~10명",
  "10명 이상",
  "30명 이상",
] as const;

export const BETA_RECORD_MANAGEMENT_OPTIONS = [
  "카카오톡",
  "종이 체크리스트",
  "구글 시트",
  "앱시트",
  "노션",
  "별도 프로그램 사용",
  "기록 안 함",
] as const;

export const BETA_PAIN_EXPERIENCE_OPTIONS = [
  "일 끝나고 입금이 늦어진 적 있다",
  "고객이 작업 문제를 제기한 적 있다",
  "직원 관리가 어렵다",
  "현장 사진이 흩어져 있다",
  "작업 완료 증명이 어렵다",
  "클레임 대응 스트레스가 크다",
] as const;

export const BETA_DISPUTE_OPTIONS = ["있다", "없다"] as const;

export const BETA_DESIRED_FEATURE_OPTIONS = [
  "작업 전후 사진 기록",
  "체크리스트",
  "고객 확인 기능",
  "전자서명",
  "작업 완료 보고서",
  "직원 출퇴근 기록",
  "분쟁 대비 자료 저장",
  "자동 리포트 생성",
] as const;

export const BETA_AVAILABILITY_OPTIONS = ["가능", "일정 조율 필요"] as const;

export type BetaIndustry = (typeof BETA_INDUSTRY_OPTIONS)[number];
export type BetaEmployeeBand = (typeof BETA_EMPLOYEE_BAND_OPTIONS)[number];
export type BetaRecordManagement = (typeof BETA_RECORD_MANAGEMENT_OPTIONS)[number];
export type BetaPainExperience = (typeof BETA_PAIN_EXPERIENCE_OPTIONS)[number];
export type BetaDispute = (typeof BETA_DISPUTE_OPTIONS)[number];
export type BetaDesiredFeature = (typeof BETA_DESIRED_FEATURE_OPTIONS)[number];
export type BetaAvailability = (typeof BETA_AVAILABILITY_OPTIONS)[number];

export type BetaApplicationPayload = {
  applicantName: string;
  contact: string;
  phone: string;
  industry: BetaIndustry;
  employeeBand: BetaEmployeeBand;
  recordManagement: BetaRecordManagement;
  painExperiences: BetaPainExperience[];
  disputeLastYear: BetaDispute;
  desiredFeatures: BetaDesiredFeature[];
  biggestPain: string;
  availability: BetaAvailability;
  consentPersonal: boolean;
};

const INDUSTRY_SET = new Set<string>(BETA_INDUSTRY_OPTIONS);
const EMPLOYEE_SET = new Set<string>(BETA_EMPLOYEE_BAND_OPTIONS);
const RECORD_SET = new Set<string>(BETA_RECORD_MANAGEMENT_OPTIONS);
const PAIN_EXP_SET = new Set<string>(BETA_PAIN_EXPERIENCE_OPTIONS);
const DISPUTE_SET = new Set<string>(BETA_DISPUTE_OPTIONS);
const FEATURE_SET = new Set<string>(BETA_DESIRED_FEATURE_OPTIONS);
const AVAIL_SET = new Set<string>(BETA_AVAILABILITY_OPTIONS);

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** KR 휴대폰 10~11자리(앞자리 0 포함) */
export function isValidKrMobileDigits(digits: string): boolean {
  if (digits.length < 10 || digits.length > 11) return false;
  if (digits.startsWith("0")) return digits.startsWith("01");
  return digits.startsWith("1") && digits.length === 10;
}

export function computeBetaPainScore(p: BetaApplicationPayload): number {
  let s = 0;
  if (p.disputeLastYear === "있다") s += 28;
  s += Math.min(p.painExperiences.length * 6, 36);
  if (p.recordManagement === "카카오톡") s += 12;
  switch (p.employeeBand) {
    case "5~10명":
      s += 6;
      break;
    case "10명 이상":
      s += 10;
      break;
    case "30명 이상":
      s += 14;
      break;
    default:
      break;
  }
  if (p.industry === "정기관리업" || p.industry === "시설관리") s += 8;
  return Math.min(s, 100);
}

export type BetaApplyValidationResult =
  | { ok: true; data: BetaApplicationPayload }
  | { ok: false; error: string };

export function parseAndValidateBetaApplication(body: unknown): BetaApplyValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "요청 형식이 올바르지 않습니다." };
  }
  const o = body as Record<string, unknown>;

  const applicantName = typeof o.applicantName === "string" ? o.applicantName.trim() : "";
  const contact = typeof o.contact === "string" ? o.contact.trim() : "";
  const phoneRaw = typeof o.phone === "string" ? o.phone.trim() : "";
  const industry = typeof o.industry === "string" ? o.industry.trim() : "";
  const employeeBand = typeof o.employeeBand === "string" ? o.employeeBand.trim() : "";
  const recordManagement = typeof o.recordManagement === "string" ? o.recordManagement.trim() : "";
  const disputeLastYear = typeof o.disputeLastYear === "string" ? o.disputeLastYear.trim() : "";
  const biggestPain = typeof o.biggestPain === "string" ? o.biggestPain.trim() : "";
  const availability = typeof o.availability === "string" ? o.availability.trim() : "";
  const consentPersonal = o.consentPersonal === true;

  if (!applicantName || applicantName.length > 80) {
    return { ok: false, error: "이름을 입력해 주세요." };
  }
  if (!contact || contact.length > 200) {
    return { ok: false, error: "연락처(이메일·카카오 등)를 입력해 주세요." };
  }
  const phoneDigits = normalizePhoneDigits(phoneRaw);
  if (!isValidKrMobileDigits(phoneDigits)) {
    return { ok: false, error: "휴대폰 번호를 확인해 주세요." };
  }
  if (!INDUSTRY_SET.has(industry)) {
    return { ok: false, error: "운영 업종을 선택해 주세요." };
  }
  if (!EMPLOYEE_SET.has(employeeBand)) {
    return { ok: false, error: "직원 수 범위를 선택해 주세요." };
  }
  if (!RECORD_SET.has(recordManagement)) {
    return { ok: false, error: "현장 기록 관리 방식을 선택해 주세요." };
  }
  if (!DISPUTE_SET.has(disputeLastYear)) {
    return { ok: false, error: "최근 1년 미수·분쟁 여부를 선택해 주세요." };
  }
  if (!AVAIL_SET.has(availability)) {
    return { ok: false, error: "일정 가능 여부를 선택해 주세요." };
  }
  if (!consentPersonal) {
    return { ok: false, error: "개인정보 수집·이용에 동의해 주세요." };
  }
  if (biggestPain.length > 8000) {
    return { ok: false, error: "불편한 점 입력이 너무 깁니다. 8000자 이내로 적어 주세요." };
  }

  const peRaw = o.painExperiences;
  const painExperiences: BetaPainExperience[] = [];
  if (Array.isArray(peRaw)) {
    for (const x of peRaw) {
      if (typeof x === "string" && PAIN_EXP_SET.has(x)) {
        painExperiences.push(x as BetaPainExperience);
      }
    }
  }

  const dfRaw = o.desiredFeatures;
  const desiredFeatures: BetaDesiredFeature[] = [];
  if (Array.isArray(dfRaw)) {
    for (const x of dfRaw) {
      if (typeof x === "string" && FEATURE_SET.has(x)) {
        desiredFeatures.push(x as BetaDesiredFeature);
      }
    }
  }

  const data: BetaApplicationPayload = {
    applicantName,
    contact,
    phone: phoneDigits,
    industry: industry as BetaIndustry,
    employeeBand: employeeBand as BetaEmployeeBand,
    recordManagement: recordManagement as BetaRecordManagement,
    painExperiences,
    disputeLastYear: disputeLastYear as BetaDispute,
    desiredFeatures,
    biggestPain,
    availability: availability as BetaAvailability,
    consentPersonal: true,
  };

  if (data.painExperiences.length === 0) {
    return { ok: false, error: "경험 항목을 한 가지 이상 선택해 주세요." };
  }
  if (data.desiredFeatures.length === 0) {
    return { ok: false, error: "필요 기능을 한 가지 이상 선택해 주세요." };
  }

  return { ok: true, data };
}
