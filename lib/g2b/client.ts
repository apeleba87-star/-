/**
 * 공공데이터포털 나라장터 입찰공고정보서비스 API 클라이언트
 * Base: https://apis.data.go.kr/1230000/ad/BidPublicInfoService
 * (API는 returnType=json 요청 시에도 XML을 반환할 수 있음 → XML 파싱 처리)
 * SSRF 방지: safeFetch + 허용 host, 타임아웃 5초
 */

import { XMLParser } from "fast-xml-parser";
import { safeFetch, G2B_ALLOWED_HOSTS } from "@/lib/safe-fetch";

const G2B_FETCH_OPTIONS: { allowedHosts: string[]; timeoutMs: number; next?: { revalidate: number } } = {
  allowedHosts: G2B_ALLOWED_HOSTS,
  timeoutMs: 5000,
  next: { revalidate: 0 },
};

const BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";

/** 첨부파일 API: 공공데이터포털 문서상 공고차수 샘플 "000" → 3자리 사용 */
function atchBidNtceOrd(ord: string | undefined): string {
  return String(ord ?? "0").replace(/\D/g, "").padStart(3, "0").slice(-3);
}

/** 첨부파일/상세 API 404 시 대체 base URL (문서: 1230000/BidPublicInfoService 또는 02, ad 경로 혼용) */
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
  const key = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  if (!key) throw new Error("DATA_GO_KR_SERVICE_KEY is not set");
  return key;
}

/**
 * 공공데이터포털: "Encoding 된 인증키"를 URL에 그대로 사용.
 * URLSearchParams에 넣으면 이중 인코딩되어 인증 오류가 나므로, serviceKey는 쿼리 앞에 직접 붙임.
 */
function buildUrl(operation: string, params: Record<string, string | number | undefined>, baseUrl = BASE_URL): string {
  const key = getServiceKey();
  const rest = new URLSearchParams({
    returnType: "json",
    ...Object.fromEntries(
      Object.entries(params).filter(([, v]) => v != null && v !== "") as [string, string][]
    ) as Record<string, string>,
  }).toString();
  return `${baseUrl}/${operation}?serviceKey=${key}&${rest}`;
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
  const res = await safeFetch(url, G2B_FETCH_OPTIONS);
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

/** 나라장터검색조건에 의한 입찰공고 용역조회. 업종코드(indstrytyCd)·업종명(indstrytyNm)으로 필터 가능. */
export type G2BServcPPSSrchParams = G2BListParams & {
  indstrytyCd?: string;  // 업종코드 (예: 1162 건물위생관리업)
  indstrytyNm?: string;  // 업종명
  bidNtceNm?: string;
  ntceInsttCd?: string;
  ntceInsttNm?: string;
  dminsttCd?: string;
  dminsttNm?: string;
  refNo?: string;
  prtcptLmtRgnCd?: string;
  prtcptLmtRgnNm?: string;
  presmptPrceBgn?: number;
  presmptPrceEnd?: number;
  prcrmntReqNo?: string;
  bidClseExcpYn?: string;
  intrntnlDivCd?: string;
  dtilPrdctClsfcNo?: string;
};

export async function getBidPblancListInfoServcPPSSrch(
  params: G2BServcPPSSrchParams
): Promise<G2BListResponse<Record<string, unknown>>> {
  const url = buildUrl("getBidPblancListInfoServcPPSSrch", {
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 100,
    inqryDiv: params.inqryDiv ?? "1",
    inqryBgnDt: params.inqryBgnDt,
    inqryEndDt: params.inqryEndDt,
    type: "json",
    indstrytyCd: params.indstrytyCd,
    indstrytyNm: params.indstrytyNm,
    bidNtceNm: params.bidNtceNm,
    ntceInsttCd: params.ntceInsttCd,
    ntceInsttNm: params.ntceInsttNm,
    dminsttCd: params.dminsttCd,
    dminsttNm: params.dminsttNm,
    refNo: params.refNo,
    prtcptLmtRgnCd: params.prtcptLmtRgnCd,
    prtcptLmtRgnNm: params.prtcptLmtRgnNm,
    presmptPrceBgn: params.presmptPrceBgn,
    presmptPrceEnd: params.presmptPrceEnd,
    prcrmntReqNo: params.prcrmntReqNo,
    bidClseExcpYn: params.bidClseExcpYn,
    intrntnlDivCd: params.intrntnlDivCd,
    dtilPrdctClsfcNo: params.dtilPrdctClsfcNo,
  });
  const res = await safeFetch(url, { ...G2B_FETCH_OPTIONS, timeoutMs: 20000 });
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
  const res = await safeFetch(url, G2B_FETCH_OPTIONS);
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
  const res = await safeFetch(url, G2B_FETCH_OPTIONS);
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
    const res = await safeFetch(url, G2B_FETCH_OPTIONS);
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
    const res = await safeFetch(url, G2B_FETCH_OPTIONS);
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
  const res = await safeFetch(url, G2B_FETCH_OPTIONS);
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
  const res = await safeFetch(url, G2B_FETCH_OPTIONS);
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

/** 면허제한정보 (공고번호·차수 기준). 문서 기준 필수: inqryDiv, bidNtceOrd, inqryBgnDt, inqryEndDt.
 * 주의: 조회 기간은 7일 이내로 해야 07 입력범위초과가 나지 않음. 응답은 기간 내 전체 목록(첫 페이지)이라 bidNtceNo로 필터되지 않음. */
export async function getBidPblancListInfoLicenseLimit(
  params: G2BAtchFileParams
): Promise<G2BListResponse<Record<string, unknown>>> {
  const ord = String(params.bidNtceOrd ?? "00").padStart(2, "0");
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const inqryBgnDt = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}0000`;
  const inqryEndDt = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}2359`;
  const url = buildUrl("getBidPblancListInfoLicenseLimit", {
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 100,
    inqryDiv: "1",
    inqryBgnDt,
    inqryEndDt,
    bidNtceNo: params.bidNtceNo,
    bidNtceOrd: ord,
  });
  const res = await safeFetch(url, G2B_FETCH_OPTIONS);
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("G2B API 429 - 요청 한도 초과. 잠시 후 재시도하세요.");
    }
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

/** 면허제한정보 (등록일시범위만). 기간으로 한 번에 조회해 수집 속도·비용 절감.
 *  1000건/페이지 응답이 크므로 타임아웃을 20초로 늘림.
 *  G2B API는 HTTP 200으로 한도초과/에러를 반환할 수 있으나 resultCode 포맷이 불일치("0"/"00"/숫자)
 *  하므로 body 결과코드는 로깅만 하고, 실질적 에러는 resultMsg로 판단한다.
 */
export async function getBidPblancListInfoLicenseLimitByRange(
  params: G2BListParams & { pageNo?: number; numOfRows?: number }
): Promise<G2BListResponse<Record<string, unknown>>> {
  const url = buildUrl("getBidPblancListInfoLicenseLimit", {
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 1000,
    inqryDiv: "1",
    inqryBgnDt: params.inqryBgnDt,
    inqryEndDt: params.inqryEndDt,
  });
  // 1000건 페이지는 응답이 느릴 수 있으므로 20초 타임아웃 사용
  const res = await safeFetch(url, { ...G2B_FETCH_OPTIONS, timeoutMs: 20000 });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("G2B API 429 - 요청 한도 초과. 잠시 후 재시도하세요.");
    }
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
  const parsed = parseResponse(text);
  // G2B는 HTTP 200 이면서 body에 에러를 담는 경우 있음
  // resultCode는 "00"/"0"/0 등 포맷 불일치가 있어 resultMsg로만 rate-limit 감지
  const header = parsed.response?.header as { resultCode?: string; resultMsg?: string } | undefined;
  const rm = String(header?.resultMsg ?? "").toUpperCase();
  if (rm.includes("LIMIT") || rm.includes("EXCEED") || rm.includes("한도")) {
    throw new Error(`G2B 면허제한 API 요청 한도 초과: ${header?.resultMsg}`);
  }
  return parsed;
}

/** 용역 입찰공고 상세정보 (입찰제한·업종제한 등). 공고번호·차수 기준 1건 조회. 404 시 대체 base URL·3자리 차수 재시도. (※ 25개 오퍼레이션에 없음, 면허제한 API 사용 권장) */
export async function getBidPblancListInfoServcDtlInfo(
  params: G2BAtchFileParams
): Promise<G2BListResponse<Record<string, unknown>>> {
  const ord2 = String(params.bidNtceOrd ?? "00").padStart(2, "0");
  const ord3 = atchBidNtceOrd(params.bidNtceOrd);
  const opts = {
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 10,
    bidNtceNo: params.bidNtceNo,
  };
  let lastError: Error | null = null;
  for (const baseUrl of ATCH_BASE_URL_ALTERNATIVES) {
    for (const bidNtceOrd of [ord2, ord3]) {
      try {
        const url = buildUrl("getBidPblancListInfoServcDtlInfo", { ...opts, bidNtceOrd }, baseUrl);
        const res = await safeFetch(url, G2B_FETCH_OPTIONS);
        const text = await res.text();
        if (res.ok) return parseResponse(text) as Promise<G2BListResponse<Record<string, unknown>>>;
        let errMsg = `G2B API ${res.status}`;
        try {
          const parsed = parseResponse(text);
          const header = parsed.response?.header as { resultMsg?: string; resultCode?: string } | undefined;
          const msg = header?.resultMsg ?? header?.resultCode;
          if (msg) errMsg += ` - ${msg}`;
        } catch {
          if (text.length < 200) errMsg += ` - ${text.slice(0, 100)}`;
        }
        lastError = new Error(errMsg);
        if (res.status !== 404 && res.status !== 500) throw lastError;
      } catch (e) {
        if (e instanceof Error && !e.message.includes("404") && !e.message.includes("500")) throw e;
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }
  }
  throw lastError ?? new Error("상세 API 조회 실패(404/500). 오퍼레이션 미지원이거나 일시 장애일 수 있음.");
}

/** 배열로 정규화 (단일 객체면 1개 배열로) */
function toItemArray<T>(items: T | T[] | null | undefined): T[] {
  if (items == null) return [];
  return Array.isArray(items) ? items : [items];
}

/** 응답에서 item 배열 추출. G2B 오퍼레이션별로 body 구조가 다를 수 있어 여러 경로 시도. */
export function extractItems<T>(data: G2BListResponse<T>): T[] {
  const body = data.response?.body as Record<string, unknown> | undefined;
  if (!body) return [];

  const itemsBag = body.items as Record<string, unknown> | unknown[] | undefined;
  const candidates: unknown[] = [
    itemsBag && typeof itemsBag === "object" && !Array.isArray(itemsBag)
      ? (itemsBag as Record<string, unknown>).item ?? (itemsBag as Record<string, unknown>).Item
      : itemsBag,
    body.item,
    body.Item,
    body.list,
    body.data,
  ].filter(Boolean);

  for (const raw of candidates) {
    const arr = toItemArray(raw);
    if (arr.length > 0) return arr as T[];
  }
  return [];
}
