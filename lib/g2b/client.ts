/**
 * 공공데이터포털 나라장터 입찰공고정보서비스 API 클라이언트
 * Base: https://apis.data.go.kr/1230000/ad/BidPublicInfoService
 * (API는 returnType=json 요청 시에도 XML을 반환할 수 있음 → XML 파싱 처리)
 */

import { XMLParser } from "fast-xml-parser";

const BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";

function parseResponse(text: string): G2BListResponse<Record<string, unknown>> {
  const trim = text.trim();
  if (trim.startsWith("<")) {
    const parser = new XMLParser({ ignoreDeclaration: true });
    const raw = parser.parse(text) as { response?: { header?: unknown; body?: { items?: { item?: unknown }; totalCount?: number } } };
    const body = raw.response?.body;
    const item = body?.items?.item;
    const items = item != null ? (Array.isArray(item) ? item : [item]) : [];
    return {
      response: {
        header: raw.response?.header as { resultCode: string; resultMsg: string } | undefined,
        body: { totalCount: body?.totalCount ?? items.length, items: { item: items as Record<string, unknown>[] } },
      },
    };
  }
  return JSON.parse(text) as G2BListResponse<Record<string, unknown>>;
}

export type G2BListParams = {
  pageNo?: number;
  numOfRows?: number;
  inqryBgnDt: string; // YYYYMMDD 또는 YYYYMMDDHHmm
  inqryEndDt: string;  // YYYYMMDD 또는 YYYYMMDDHHmm
  inqryDiv?: string;  // 1: 등록일, 2: 개찰일 등
};

function getServiceKey(): string {
  const key = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!key) throw new Error("DATA_GO_KR_SERVICE_KEY is not set");
  return key;
}

function buildUrl(operation: string, params: Record<string, string | number | undefined>): string {
  const key = getServiceKey();
  const search = new URLSearchParams({
    serviceKey: key,
    returnType: "json",
    ...Object.fromEntries(
      Object.entries(params).filter(([, v]) => v != null && v !== "") as [string, string][]
    ) as Record<string, string>,
  });
  return `${BASE_URL}/${operation}?${search.toString()}`;
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

/** 응답에서 item 배열 추출 (단일 객체면 배열로) */
export function extractItems<T>(data: G2BListResponse<T>): T[] {
  const body = data.response?.body;
  if (!body) return [];
  const items = body.items?.item ?? body.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}
