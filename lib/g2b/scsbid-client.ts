/**
 * 공공데이터포털 나라장터 낙찰정보서비스 ScsbidInfoService (용역 Servc)
 * Base: https://apis.data.go.kr/1230000/as/ScsbidInfoService
 * 응답은 JSON 요청 시에도 XML일 수 있음 → parseG2bApiResponseText 재사용
 */

import { safeFetch, G2B_ALLOWED_HOSTS } from "@/lib/safe-fetch";
import { parseG2bApiResponseText, type G2BListParams, type G2BListResponse } from "./client";

const SCSBID_BASE = "https://apis.data.go.kr/1230000/as/ScsbidInfoService";

const SCSBID_FETCH_OPTIONS = {
  allowedHosts: G2B_ALLOWED_HOSTS,
  timeoutMs: 60_000,
  next: { revalidate: 0 },
} as const;

/** 입찰공고(BidPublicInfo)용 `DATA_GO_KR_SERVICE_KEY`와 별도. 낙찰정보(ScsbidInfo) 활용신청 키. */
export const DATA_GO_KR_SCSBID_SERVICE_KEY_ENV = "DATA_GO_KR_SCSBID_SERVICE_KEY";

function getServiceKey(): string {
  const key = process.env.DATA_GO_KR_SCSBID_SERVICE_KEY?.trim();
  if (!key) {
    throw new Error(
      `${DATA_GO_KR_SCSBID_SERVICE_KEY_ENV} is not set (나라장터 낙찰정보서비스 전용 인증키)`
    );
  }
  return key;
}

/** 공공데이터포털: 인증키는 URLSearchParams에 넣지 않고 쿼리 앞에 직접 붙임(이중 인코딩 방지). */
function buildScsbidUrl(operation: string, params: Record<string, string | number | undefined>): string {
  const key = getServiceKey();
  const rest = new URLSearchParams({
    type: "json",
    ...Object.fromEntries(
      Object.entries(params).filter(([, v]) => v != null && v !== "") as [string, string][]
    ),
  }).toString();
  return `${SCSBID_BASE}/${operation}?serviceKey=${key}&${rest}`;
}

/** ScsbidInfoService 헤더 resultCode. 문서상 정상은 주로 "00". */
export function isScsbidApiHeaderOk(data: G2BListResponse<unknown>): boolean {
  const h = data.response?.header as { resultCode?: string | number } | undefined;
  if (h == null || h.resultCode === undefined || h.resultCode === null || h.resultCode === "") {
    return true;
  }
  const code = String(h.resultCode).trim();
  if (code === "PARSE_ERR" || code === "EMPTY") return false;
  return (
    code === "00" ||
    code === "000" ||
    code === "0000" ||
    code === "NORMAL_SERVICE" ||
    code === "INFO-000"
  );
}

export type ScsbidListSttusServcParams = G2BListParams & {
  /** 1: 등록일시, 2: 공고일시, 3: 개찰일시, 4: 공고번호 단건 등(오퍼레이션별 상이) */
  inqryDiv?: string;
};

/** 용역 낙찰 목록·현황 (getScsbidListSttusServc) */
export async function getScsbidListSttusServc(
  params: ScsbidListSttusServcParams
): Promise<G2BListResponse<Record<string, unknown>>> {
  const url = buildScsbidUrl("getScsbidListSttusServc", {
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 100,
    inqryDiv: params.inqryDiv ?? "3",
    inqryBgnDt: params.inqryBgnDt,
    inqryEndDt: params.inqryEndDt,
  });
  const res = await safeFetch(url, SCSBID_FETCH_OPTIONS);
  const text = await res.text();
  if (!res.ok) {
    let errMsg = `ScsbidInfoService error: ${res.status}`;
    try {
      const parsed = parseG2bApiResponseText(text);
      const header = parsed.response?.header as { resultMsg?: string; resultCode?: string } | undefined;
      const msg = header?.resultMsg ?? header?.resultCode;
      if (msg) errMsg += ` - ${msg}`;
    } catch {
      if (text.length < 200) errMsg += ` - ${text}`;
    }
    throw new Error(errMsg);
  }
  return parseG2bApiResponseText(text);
}
