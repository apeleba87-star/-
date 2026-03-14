/**
 * 관리자 전용: 공고번호 1개로 G2B 입찰공고정보서비스 25개 오퍼레이션 전부 호출 테스트.
 * 각 API 성공/실패와 응답 필드 요약을 반환해, 업종제한 데이터가 어디서 오는지 확인용.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { safeFetch, G2B_ALLOWED_HOSTS } from "@/lib/safe-fetch";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";

const OPERATIONS: { no: number; name: string; paramType: "date" | "bid" | "dateAndBid" }[] = [
  { no: 1, name: "getBidPblancListInfoCnstwk", paramType: "date" },
  { no: 2, name: "getBidPblancListInfoServc", paramType: "date" },
  { no: 3, name: "getBidPblancListInfoFrgcpt", paramType: "date" },
  { no: 4, name: "getBidPblancListInfoThng", paramType: "date" },
  { no: 5, name: "getBidPblancListInfoThngBsisAmount", paramType: "dateAndBid" },
  { no: 6, name: "getBidPblancListInfoCnstwkBsisAmount", paramType: "dateAndBid" },
  { no: 7, name: "getBidPblancListInfoServcBsisAmount", paramType: "bid" },
  { no: 8, name: "getBidPblancListInfoChgHstryThng", paramType: "dateAndBid" },
  { no: 9, name: "getBidPblancListInfoChgHstryCnstwk", paramType: "dateAndBid" },
  { no: 10, name: "getBidPblancListInfoChgHstryServc", paramType: "dateAndBid" },
  { no: 11, name: "getBidPblancListInfoCnstwkPPSSrch", paramType: "date" },
  { no: 12, name: "getBidPblancListInfoServcPPSSrch", paramType: "date" },
  { no: 13, name: "getBidPblancListInfoFrgcptPPSSrch", paramType: "date" },
  { no: 14, name: "getBidPblancListInfoThngPPSSrch", paramType: "date" },
  { no: 15, name: "getBidPblancListInfoLicenseLimit", paramType: "dateAndBid" },
  { no: 16, name: "getBidPblancListInfoPrtcptPsblRgn", paramType: "bid" },
  { no: 17, name: "getBidPblancListInfoThngPurchsObjPrdct", paramType: "dateAndBid" },
  { no: 18, name: "getBidPblancListInfoServcPurchsObjPrdct", paramType: "dateAndBid" },
  { no: 19, name: "getBidPblancListInfoFrgcptPurchsObjPrdct", paramType: "dateAndBid" },
  { no: 20, name: "getBidPblancListInfoEorderAtchFileInfo", paramType: "bid" },
  { no: 21, name: "getBidPblancListInfoEtc", paramType: "date" },
  { no: 22, name: "getBidPblancListInfoEtcPPSSrch", paramType: "date" },
  { no: 23, name: "getBidPblancListPPIFnlRfpIssAtchFileInfo", paramType: "bid" },
  { no: 24, name: "getBidPblancListBidPrceCalclAInfo", paramType: "dateAndBid" },
  { no: 25, name: "getBidPblancListEvaluationIndstrytyMfrcInfo", paramType: "dateAndBid" },
];

function getDateRange(): { inqryBgnDt: string; inqryEndDt: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 14);
  return {
    inqryBgnDt: `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}0000`,
    inqryEndDt: `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}2359`,
  };
}

function buildParams(
  op: (typeof OPERATIONS)[0],
  bidNtceNo: string,
  bidNtceOrd: string,
  dateRange: { inqryBgnDt: string; inqryEndDt: string }
): Record<string, string> {
  const base: Record<string, string> = {
    returnType: "json",
    pageNo: "1",
    numOfRows: "10",
  };
  if (op.paramType === "date" || op.paramType === "dateAndBid") {
    base.inqryBgnDt = dateRange.inqryBgnDt;
    base.inqryEndDt = dateRange.inqryEndDt;
    base.inqryDiv = "1";
  }
  if (op.paramType === "bid" || op.paramType === "dateAndBid") {
    base.bidNtceNo = bidNtceNo.replace(/-000$/i, "").trim();
    base.bidNtceOrd = bidNtceOrd.replace(/\D/g, "").padStart(2, "0").slice(-2) || "00";
  }
  return base;
}

function parseJsonResponse(text: string): {
  resultCode?: string;
  resultMsg?: string;
  totalCount?: number;
  itemKeys?: string[];
  sample?: Record<string, unknown>;
  rawPreview?: string;
} {
  try {
    const data = JSON.parse(text) as {
      response?: {
        header?: { resultCode?: string; resultMsg?: string };
        body?: {
          totalCount?: number;
          items?: { item?: unknown };
          item?: unknown;
        };
      };
    };
    const header = data.response?.header;
    const body = data.response?.body;
    let itemKeys: string[] | undefined;
    let sample: Record<string, unknown> | undefined;
    const raw = body?.items?.item ?? body?.item;
    const arr = raw != null ? (Array.isArray(raw) ? raw : [raw]) : [];
    if (arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null) {
      sample = arr[0] as Record<string, unknown>;
      itemKeys = Object.keys(sample);
    }
    return {
      resultCode: header?.resultCode,
      resultMsg: header?.resultMsg,
      totalCount: body?.totalCount,
      itemKeys,
      sample: sample
        ? Object.fromEntries(
            Object.entries(sample).filter(
              ([k]) =>
                /업종|indstry|lcns|면허|제한|limit|limitNm|clsfc|srvce|divNm/i.test(k)
            )
          )
        : undefined,
      rawPreview: text.slice(0, 500),
    };
  } catch {
    return { rawPreview: text.slice(0, 500) };
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const key = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  if (!key) {
    return NextResponse.json({ ok: false, error: "DATA_GO_KR_SERVICE_KEY 없음" }, { status: 400 });
  }

  // 콤마로 구분된 여러 공고번호 지원. 기본값: 위생관리업 공고 2건
  const bidParam = req.nextUrl.searchParams.get("bidNtceNo")?.trim()
    || "R26BK01394152-000,R26BK01393586-000";
  const bidList = bidParam.split(",").map((s) => {
    const t = s.trim().replace(/-000$/i, "").trim() || s.trim();
    const ord = s.includes("-000") ? "00" : req.nextUrl.searchParams.get("bidNtceOrd")?.trim() || "00";
    return { bidNtceNo: t, bidNtceOrd: ord };
  }).filter((b) => b.bidNtceNo.length > 0);

  if (bidList.length === 0) {
    return NextResponse.json({ ok: false, error: "bidNtceNo 필요 (예: ?bidNtceNo=R26BK01394152-000,R26BK01393586-000)" }, { status: 400 });
  }

  const dateRange = getDateRange();

  type OneResult = {
    no: number;
    name: string;
    paramType: string;
    status: number;
    ok: boolean;
    resultCode?: string;
    resultMsg?: string;
    totalCount?: number;
    itemKeys?: string[];
    industryRelatedFields?: Record<string, unknown>;
    error?: string;
  };

  const byBid: { bidNtceNo: string; bidNtceOrd: string; results: OneResult[] }[] = [];
  const allWithIndustryFields: { bidNtceNo: string; no: number; name: string; totalCount?: number; industryRelatedFields?: Record<string, unknown>; itemKeys?: string[] }[] = [];

  for (const { bidNtceNo, bidNtceOrd } of bidList) {
    const results: OneResult[] = [];

    for (const op of OPERATIONS) {
      const params = buildParams(op, bidNtceNo, bidNtceOrd, dateRange);
      const qs = new URLSearchParams(params).toString();
      const url = `${BASE_URL}/${op.name}?serviceKey=${encodeURIComponent(key)}&${qs}`;

      try {
        const res = await safeFetch(url, {
          allowedHosts: G2B_ALLOWED_HOSTS,
          timeoutMs: 15000,
        });
        const text = await res.text();
        const parsed = parseJsonResponse(text);

        const entry = {
          no: op.no,
          name: op.name,
          paramType: op.paramType,
          status: res.status,
          ok: res.ok && (parsed.resultCode === "00" || parsed.resultCode === "0" || !parsed.resultCode),
          resultCode: parsed.resultCode,
          resultMsg: parsed.resultMsg,
          totalCount: parsed.totalCount,
          itemKeys: parsed.itemKeys,
          industryRelatedFields:
            parsed.sample && Object.keys(parsed.sample).length > 0 ? parsed.sample : undefined,
          error: !res.ok ? `HTTP ${res.status}` : undefined,
        };
        results.push(entry);

        if (entry.industryRelatedFields && Object.keys(entry.industryRelatedFields).length > 0) {
          allWithIndustryFields.push({
            bidNtceNo,
            no: entry.no,
            name: entry.name,
            totalCount: entry.totalCount,
            industryRelatedFields: entry.industryRelatedFields,
            itemKeys: entry.itemKeys,
          });
        }
      } catch (e) {
        results.push({
          no: op.no,
          name: op.name,
          paramType: op.paramType,
          status: 0,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }

      await new Promise((r) => setTimeout(r, 250));
    }

    byBid.push({ bidNtceNo, bidNtceOrd, results });
  }

  const totalSuccessWithData = byBid.reduce(
    (sum, b) => sum + b.results.filter((r) => r.ok && (r.totalCount ?? 0) > 0).length,
    0
  );

  return NextResponse.json({
    ok: true,
    description: "위생관리업 공고 2건 기준 25개 API 테스트 (기본값 변경됨)",
    bidList: bidList.map((b) => ({ bidNtceNo: b.bidNtceNo, bidNtceOrd: b.bidNtceOrd })),
    dateRange,
    totalApis: OPERATIONS.length,
    successWithDataTotal: totalSuccessWithData,
    apisWithIndustryRelatedFields: allWithIndustryFields,
    byBid,
  });
}
