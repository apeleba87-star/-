import { createHmac } from "node:crypto";

/**
 * 네이버 검색광고 API — 키워드 도구
 * @see https://github.com/naver/searchad-apidoc
 *
 * monthlyPcQcCnt + monthlyMobileQcCnt = 최근 약 30일 통합검색 조회 추정치(전국).
 * 데이터랩 지수와 기준이 다르며 참고용입니다.
 */

const SEARCHAD_BASE = "https://api.searchad.naver.com";

export type SearchAdKeywordVolume = {
  keyword: string;
  pc: number | null;
  mobile: number | null;
  total: number | null;
  belowTen: boolean;
};

type KeywordListItem = {
  relKeyword?: string;
  monthlyPcQcCnt?: number | string;
  monthlyMobileQcCnt?: number | string;
};

function parseQcCount(raw: number | string | undefined): { value: number | null; belowTen: boolean } {
  if (raw == null) return { value: null, belowTen: false };
  if (typeof raw === "number" && Number.isFinite(raw)) return { value: raw, belowTen: false };
  const s = String(raw).trim();
  if (s === "< 10" || s === "<10") return { value: null, belowTen: true };
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? { value: n, belowTen: false } : { value: null, belowTen: false };
}

function signRequest(timestamp: string, method: string, uri: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${method}.${uri}`).digest("base64");
}

export function getSearchAdCredentials(): {
  apiKey: string;
  secret: string;
  customerId: string;
} | null {
  const apiKey = process.env.NAVER_SEARCHAD_API_KEY?.trim();
  const secret = process.env.NAVER_SEARCHAD_SECRET_KEY?.trim();
  const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID?.trim();
  if (!apiKey || !secret || !customerId) return null;
  return { apiKey, secret, customerId };
}

/** hintKeywords 1개 — keywordList[0]이 입력 키워드에 가장 가깝다 */
export async function fetchSearchAdKeywordVolume(keyword: string): Promise<SearchAdKeywordVolume | null> {
  const creds = getSearchAdCredentials();
  if (!creds) return null;

  const uri = "/keywordstool";
  const method = "GET";
  const timestamp = String(Date.now());
  const signature = signRequest(timestamp, method, uri, creds.secret);

  const params = new URLSearchParams({
    hintKeywords: keyword.trim(),
    showDetail: "1",
  });

  const res = await fetch(`${SEARCHAD_BASE}${uri}?${params}`, {
    method,
    headers: {
      "X-Timestamp": timestamp,
      "X-API-KEY": creds.apiKey,
      "X-Customer": creds.customerId,
      "X-Signature": signature,
    },
    next: { revalidate: 86400 },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Naver Search Ad HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = JSON.parse(text) as { keywordList?: KeywordListItem[] };
  const list = json.keywordList ?? [];
  const row =
    list.find((k) => k.relKeyword?.replace(/\s/g, "") === keyword.replace(/\s/g, "")) ?? list[0];
  if (!row) return null;

  const pc = parseQcCount(row.monthlyPcQcCnt);
  const mobile = parseQcCount(row.monthlyMobileQcCnt);
  const belowTen = pc.belowTen || mobile.belowTen;
  const total =
    pc.value != null && mobile.value != null
      ? pc.value + mobile.value
      : pc.value ?? mobile.value ?? null;

  return {
    keyword,
    pc: pc.value,
    mobile: mobile.value,
    total,
    belowTen,
  };
}
