/**
 * 공공데이터포털 나라장터 입찰공고정보서비스 API 클라이언트
 * Base: https://apis.data.go.kr/1230000/ad/BidPublicInfoService
 * (API는 returnType=json 요청 시에도 XML을 반환할 수 있음 → XML 파싱 처리)
 */

import { XMLParser } from "fast-xml-parser";

const BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";

/** 첨부파일 API: 공공데이터포털 문서상 공고차수 샘플 "000" → 3자리 사용 */
function atchBidNtceOrd(ord: string | undefined): string {
  return String(ord ?? "0").replace(/\D/g, "").padStart(3, "0").slice(-3);
}

/** 첨부파일 API 404/500 시 대체 base URL (문서: 변경 후 BidPublicInfoService02 우선) */
const ATCH_BASE_URL_ALTERNATIVES = [
  "https://apis.data.go.kr/1230000/BidPublicInfoService02",
  "https://apis.data.go.kr/1230000/BidPublicInfoService",
  BASE_URL,
  "https://apis.data.go.kr/1230000/ad/BidPublicInfoService02",
];

const EMPTY_RESPONSE: G2BListResponse<Record<string, unknown>> = {
  response: {
    header: { resultCode: "EMPTY", resultMsg: "Empty or invalid response" },
    body: { totalCount: 0, items: { item: [] } },
  },
};

function parseResponse(text: string): G2BListResponse<Record<string, unknown>> {
  const trim = text.trim();
  if (!trim) return EMPTY_RESPONSE;
  if (trim.startsWith("<")) {
    try {
      const parser = new XMLParser({ ignoreDeclaration: true });
      const raw = parser.parse(text) as {
        response?: {
          header?: unknown;
          body?: {
            items?: { item?: unknown };
            item?: unknown;
            totalCount?: number;
          };
        };
      };
      const body = raw.response?.body;
      const fromItems = body?.items?.item;
      const fromDirect = body?.item;
      const item = fromItems ?? fromDirect;
      const items = item != null ? (Array.isArray(item) ? item : [item]) : [];
      return {
        response: {
          header: raw.response?.header as { resultCode: string; resultMsg: string } | undefined,
          body: {
            totalCount: (body as { totalCount?: number } | undefined)?.totalCount ?? items.length,
            items: { item: items as Record<string, unknown>[] },
            item: items.length ? items[0] : undefined,
          },
        },
      };
    } catch {
      return { ...EMPTY_RESPONSE, response: { ...EMPTY_RESPONSE.response, header: { resultCode: "PARSE_ERR", resultMsg: "XML parse error" } } };
    }
  }
  try {
    return JSON.parse(text) as G2BListResponse<Record<string, unknown>>;
  } catch {
    return { ...EMPTY_RESPONSE, response: { ...EMPTY_RESPONSE.response, header: { resultCode: "PARSE_ERR", resultMsg: "Unexpected end of JSON input or invalid JSON" } } };
  }
}

export type G2BListParams = {
  pageNo?: number;
  numOfRows?: number;
  inqryBgnDt: string; // YYYYMMDD 또는 YYYYMMDDHHmm
  inqryEndDt: string;  // YYYYMMDD 또는 YYYYMMDDHHmm
  inqryDiv?: string;  // 1: 등록일, 2: 개찰일 등
};

export type G2BAtchFileParams = {
  pageNo?: number;
  numOfRows?: number;
  bidNtceNo: string;
  bidNtceOrd: string;
};

function getServiceKey(): string {
  const key = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!key) throw new Error("DATA_GO_KR_SERVICE_KEY is not set");
  return key;
}

function buildUrl(operation: string, params: Record<string, string | number | undefined>, baseUrl = BASE_URL): string {
  const key = getServiceKey();
  const search = new URLSearchParams({
    serviceKey: key,
    returnType: "json",
    ...Object.fromEntries(
      Object.entries(params).filter(([, v]) => v != null && v !== "") as [string, string][]
    ) as Record<string, string>,
  });
  return `${baseUrl}/${operation}?${search.toString()}`;
}

export interface G2BListResponse<T> {
  response?: {
    body?: {
      totalCount?: number;
      items?: { item: T | T[] };
      item?: T;
    };
    header?: { resultCode: string; resultMsg: string };
  };
}

/** 용역 입찰 목록 (청소·미화 등 주로 용역) */
export async function getBidPblancListInfoServc(
  params: G2BListParams
): Promise<G2BListResponse<Record<string, unknown>>> {
  const url = buildUrl("getBidPblancListInfoServc", {
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 100,
    inqryBgnDt: params.inqryBgnDt,
    inqryEndDt: params.inqryEndDt,
    inqryDiv: params.inqryDiv ?? "1",
  });
  const res = await fetch(url, { next: { revalidate: 0 } });
  const text = await res.text();
  if (!res.ok) {
    let errMsg = `G2B API error: ${res.status}`;
    try {
      const parsed = parseResponse(text);
      const header = parsed.response?.header as { resultMsg?: string; resultCode?: string } | undefined;
      const msg = header?.resultMsg ?? header?.resultCode;
      if (msg) errMsg += ` - ${msg}`;
    } catch {
      if (text.length < 200) errMsg += ` - ${text}`;
    }
    throw new Error(errMsg);
  }
  return parseResponse(text) as Promise<G2BListResponse<Record<string, unknown>>>;
}

/** 공사 입찰 목록 */
export async function getBidPblancListInfoCnstwk(
  params: G2BListParams
): Promise<G2BListResponse<Record<string, unknown>>> {
  const url = buildUrl("getBidPblancListInfoCnstwk", {
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 100,
    inqryBgnDt: params.inqryBgnDt,
    inqryEndDt: params.inqryEndDt,
    inqryDiv: params.inqryDiv ?? "1",
  });
  const res = await fetch(url, { next: { revalidate: 0 } });
  const text = await res.text();
  if (!res.ok) {
    let errMsg = `G2B API error: ${res.status}`;
    try {
      const parsed = parseResponse(text);
      const header = parsed.response?.header as { resultMsg?: string; resultCode?: string } | undefined;
      const msg = header?.resultMsg ?? header?.resultCode;
      if (msg) errMsg += ` - ${msg}`;
    } catch {
      if (text.length < 200) errMsg += ` - ${text}`;
    }
    throw new Error(errMsg);
  }
  return parseResponse(text) as Promise<G2BListResponse<Record<string, unknown>>>;
}

/** 물품 입찰 목록 */
export async function getBidPblancListInfoThng(
  params: G2BListParams
): Promise<G2BListResponse<Record<string, unknown>>> {
  const url = buildUrl("getBidPblancListInfoThng", {
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 100,
    inqryBgnDt: params.inqryBgnDt,
    inqryEndDt: params.inqryEndDt,
    inqryDiv: params.inqryDiv ?? "1",
  });
  const res = await fetch(url, { next: { revalidate: 0 } });
  const text = await res.text();
  if (!res.ok) {
    let errMsg = `G2B API error: ${res.status}`;
    try {
      const parsed = parseResponse(text);
      const header = parsed.response?.header as { resultMsg?: string; resultCode?: string } | undefined;
      const msg = header?.resultMsg ?? header?.resultCode;
      if (msg) errMsg += ` - ${msg}`;
    } catch {
      if (text.length < 200) errMsg += ` - ${text}`;
    }
    throw new Error(errMsg);
  }
  return parseResponse(text) as Promise<G2BListResponse<Record<string, unknown>>>;
}

/** e발주 첨부파일 목록 (공고차수 3자리, 404 시 대체 base URL 재시도) */
export async function getBidPblancListInfoEorderAtchFileInfo(
  params: G2BAtchFileParams
): Promise<G2BListResponse<Record<string, unknown>>> {
  const opParams = {
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 100,
    bidNtceNo: params.bidNtceNo,
    bidNtceOrd: atchBidNtceOrd(params.bidNtceOrd),
  };
  let lastError: Error | null = null;
  for (const baseUrl of ATCH_BASE_URL_ALTERNATIVES) {
    const url = buildUrl("getBidPblancListInfoEorderAtchFileInfo", opParams, baseUrl);
    const res = await fetch(url, { next: { revalidate: 0 } });
    const text = await res.text();
    if (res.ok) return parseResponse(text) as G2BListResponse<Record<string, unknown>>;
    lastError = new Error(
      `G2B API ${res.status}${text ? ` - ${text.slice(0, 100)}` : ""}`
    );
    if (res.status !== 404) throw lastError;
  }
  throw lastError ?? new Error("G2B attachment API failed");
}

/**
 * 디버그용: 첨부파일 API 호출 후 원문 응답 + 파싱 결과 반환 (원인 분석용)
 * 404이면 공공데이터포털 문서상 대체 base URL로 순차 재시도.
 */
export async function getBidPblancListInfoEorderAtchFileInfoRaw(
  params: G2BAtchFileParams
): Promise<{ raw: string; parsed: G2BListResponse<Record<string, unknown>>; httpStatus: number; baseUrlUsed?: string }> {
  const opParams = {
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 100,
    bidNtceNo: params.bidNtceNo,
    bidNtceOrd: atchBidNtceOrd(params.bidNtceOrd),
  };

  let last = { raw: "", parsed: EMPTY_RESPONSE, httpStatus: 404 as number, baseUrlUsed: "" };

  for (const baseUrl of ATCH_BASE_URL_ALTERNATIVES) {
    const url = buildUrl("getBidPblancListInfoEorderAtchFileInfo", opParams, baseUrl);
    const res = await fetch(url, { next: { revalidate: 0 } });
    const raw = await res.text();
    const parsed = parseResponse(raw);
    last = { raw, parsed, httpStatus: res.status, baseUrlUsed: baseUrl };
    if (res.status === 200) return last;
  }

  return last;
}

/** 용역 기초금액 상세 (공고번호·차수 기준) */
export async function getBidPblancListInfoServcBsisAmount(
  params: G2BAtchFileParams
): Promise<G2BListResponse<Record<string, unknown>>> {
  const url = buildUrl("getBidPblancListInfoServcBsisAmount", {
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 10,
    bidNtceNo: params.bidNtceNo,
    bidNtceOrd: String(params.bidNtceOrd ?? "00").padStart(2, "0"),
  });
  const res = await fetch(url, { next: { revalidate: 0 } });
  const text = await res.text();
  if (!res.ok) {
    let errMsg = `G2B API error: ${res.status}`;
    try {
      const parsed = parseResponse(text);
      const header = parsed.response?.header as { resultMsg?: string; resultCode?: string } | undefined;
      const msg = header?.resultMsg ?? header?.resultCode;
      if (msg) errMsg += ` - ${msg}`;
    } catch {
      if (text.length < 200) errMsg += ` - ${text}`;
    }
    throw new Error(errMsg);
  }
  return parseResponse(text) as Promise<G2BListResponse<Record<string, unknown>>>;
}

/** 참가가능지역 (공고번호·차수 기준) */
export async function getBidPblancListInfoPrtcptPsblRgn(
  params: G2BAtchFileParams
): Promise<G2BListResponse<Record<string, unknown>>> {
  const url = buildUrl("getBidPblancListInfoPrtcptPsblRgn", {
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 100,
    bidNtceNo: params.bidNtceNo,
    bidNtceOrd: String(params.bidNtceOrd ?? "00").padStart(2, "0"),
  });
  const res = await fetch(url, { next: { revalidate: 0 } });
  const text = await res.text();
  if (!res.ok) {
    let errMsg = `G2B API error: ${res.status}`;
    try {
      const parsed = parseResponse(text);
      const header = parsed.response?.header as { resultMsg?: string; resultCode?: string } | undefined;
      const msg = header?.resultMsg ?? header?.resultCode;
      if (msg) errMsg += ` - ${msg}`;
    } catch {
      if (text.length < 200) errMsg += ` - ${text}`;
    }
    throw new Error(errMsg);
  }
  return parseResponse(text) as Promise<G2BListResponse<Record<string, unknown>>>;
}

/** 응답에서 item 배열 추출 (단일 객체면 배열로) */
export function extractItems<T>(data: G2BListResponse<T>): T[] {
  const body = data.response?.body;
  if (!body) return [];
  const items = body.items?.item ?? body.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}
