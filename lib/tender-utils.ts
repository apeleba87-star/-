/**
 * 입찰 공고 UI 공통: 금액·날짜 포맷, D-day, 낙찰하한가·전략가 계산
 */

/** 한국식 금액 포맷 (천단위 콤마) */
export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

/** 만원 단위 요약 (예: 3,803만원) */
export function formatMoneyMan(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const man = Math.round(value / 10000);
  return man >= 10000 ? `${(man / 10000).toFixed(1)}억원` : `${man.toLocaleString("ko-KR")}만원`;
}

/** 날짜 포맷 (서버/클라이언트 동일 출력으로 hydration 오류 방지) */
export function formatDate(iso: string | null | undefined, options?: { withTime?: boolean }): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const datePart = `${y}. ${m}. ${day}.`;
  if (!options?.withTime) return datePart;
  const h = d.getHours();
  const min = d.getMinutes();
  const ampm = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 || 12;
  const timePart = `${ampm} ${hour12}:${String(min).padStart(2, "0")}`;
  return `${datePart} ${timePart}`;
}

/** D-day 문자열 */
export function dday(clseDt: string | null | undefined): string {
  if (!clseDt) return "—";
  const end = new Date(clseDt).getTime();
  if (Number.isNaN(end)) return "—";
  const day = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
  if (day < 0) return "마감";
  if (day === 0) return "D-Day";
  return `D-${day}`;
}

/** D-day 숫자 (정렬 등용) */
export function ddayNumber(clseDt: string | null | undefined): number {
  if (!clseDt) return 999999;
  const end = new Date(clseDt).getTime();
  if (Number.isNaN(end)) return 999999;
  return Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
}

/** 낙찰하한가 = 기초금액 × (낙찰하한율 / 100) */
export function calcLowerPrice(
  basePrice: number | null | undefined,
  lowerRate: number | null | undefined
): number | null {
  if (basePrice == null || lowerRate == null || Number.isNaN(basePrice) || Number.isNaN(lowerRate)) return null;
  const price = Number(basePrice);
  const rate = Number(lowerRate);
  if (rate <= 0 || rate > 100) return null;
  return Math.floor(price * (rate / 100));
}

/** 전략 가격: 하한가, -1%, -2%, -3% (소수점 버림) */
export function calcStrategyPrices(lowerPrice: number | null | undefined): {
  lower: number;
  pct1: number;
  pct2: number;
  pct3: number;
} | null {
  if (lowerPrice == null || Number.isNaN(lowerPrice) || lowerPrice < 0) return null;
  const lower = Math.floor(lowerPrice);
  return {
    lower,
    pct1: Math.floor(lower * 0.99),
    pct2: Math.floor(lower * 0.98),
    pct3: Math.floor(lower * 0.97),
  };
}

/** raw 객체에서 기초금액 추출 (공공데이터 API 필드명) - 목록/상세 공통 */
const BASE_AMT_KEYS = [
  "bssamt", "bsisAmt", "BsisAmt", "base_amt", "기초금액", "추정가격", "예정가격", "estmtAmt", "estmt_amt",
  "asignBdgtAmt", "bdgtAmt", "배정예산금액", "예산금액", "presmtPrce", "presmt_prce",
];

function pickRawNumber(raw: unknown, keys: string[]): number | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  for (const k of keys) {
    const v = r[k];
    if (v == null) continue;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return null;
}

export function getBaseAmtFromRaw(raw: unknown): number | null {
  return pickRawNumber(raw, BASE_AMT_KEYS);
}

/** raw 객체에서 낙찰하한율 추출 (공공데이터 API 필드명) */
export function getLowerRateFromRaw(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const keys = [
    "sucsfbidLwltRate",
    "sucsBidLwltRate",
    "낙찰하한율",
    "lwltRate",
    "lowerRate",
  ];
  for (const k of keys) {
    const v = r[k];
    if (v == null) continue;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(n) && n > 0 && n <= 100) return n;
  }
  return null;
}

/** 업종 라벨 (categories → 한글) */
export function categoryLabel(categories: string[] | null | undefined): string {
  if (!categories?.length) return "—";
  const hasCleaning = categories.includes("cleaning");
  const hasDisinfection = categories.includes("disinfection");
  if (hasCleaning && hasDisinfection) return "청소·소독·방역";
  if (hasCleaning) return "건물위생관리업";
  if (hasDisinfection) return "소독·방역";
  return "기타";
}

/** 지역 짧게 (경상북도 김천시 → 경북 김천) */
export function shortRegion(full: string | null | undefined): string {
  if (!full?.trim()) return "—";
  const s = full.trim();
  const map: [string, string][] = [
    ["경상북도", "경북"],
    ["경상남도", "경남"],
    ["전라북도", "전북"],
    ["전라남도", "전남"],
    ["충청북도", "충북"],
    ["충청남도", "충남"],
    ["제주특별자치도", "제주"],
    ["제주도", "제주"],
  ];
  let out = s;
  for (const [from, to] of map) {
    out = out.replace(new RegExp(from, "g"), to);
  }
  return out.replace(/\s+/g, " ").trim();
}

/** 텍스트에서 시/도 추출 (필터용) - 서울, 부산, ... */
const SIDO_PATTERNS: [RegExp, string][] = [
  [/서울특별시|^서울\b/, "서울"],
  [/부산광역시|^부산\b/, "부산"],
  [/대구광역시|^대구\b/, "대구"],
  [/인천광역시|^인천\b/, "인천"],
  [/광주광역시|^광주\b/, "광주"],
  [/대전광역시|^대전\b/, "대전"],
  [/울산광역시|^울산\b/, "울산"],
  [/세종특별자치시|^세종\b/, "세종"],
  [/경기도|^경기\b/, "경기"],
  [/강원특별자치도|강원도|^강원\b/, "강원"],
  [/충청북도|충북특별자치도|^충북\b/, "충북"],
  [/충청남도|충남특별자치도|^충남\b/, "충남"],
  [/전북특별자치도|전라북도|^전북\b/, "전북"],
  [/전라남도|^전남\b/, "전남"],
  [/경상북도|^경북\b/, "경북"],
  [/경상남도|^경남\b/, "경남"],
  [/제주특별자치도|제주도|^제주\b/, "제주"],
];

export function parseRegionSido(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const s = text.trim();
  for (const [pattern, sido] of SIDO_PATTERNS) {
    if (pattern.test(s)) return sido;
  }
  return null;
}

/** 텍스트에서 시/도 목록 추출 (쉼표 등 구분, region_sido_list 캐시용) */
export function parseRegionSidoList(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  const parts = text.split(/[,，\/]/).map((p) => p.trim()).filter(Boolean);
  const list: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const sido = parseRegionSido(part);
    if (sido && !seen.has(sido)) {
      seen.add(sido);
      list.push(sido);
    }
  }
  if (list.length > 0) return list;
  const single = parseRegionSido(text);
  return single ? [single] : [];
}

/** 억/만원 포맷 (입찰 목록용) */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount) || amount < 0) return "—";
  const eok = Math.floor(amount / 100_000_000);
  const man = Math.floor((amount % 100_000_000) / 10_000);
  if (eok > 0 && man > 0) return `${eok.toLocaleString()}억 ${man.toLocaleString()}만원`;
  if (eok > 0) return `${eok.toLocaleString()}억원`;
  return `${man.toLocaleString()}만원`;
}
