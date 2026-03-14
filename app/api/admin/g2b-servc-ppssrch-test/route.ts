/**
 * 관리자 전용: getBidPblancListInfoServcPPSSrch 테스트.
 * 26.3.13 기준 건물위생관리업 공고 2건: R26BK01394152-000, R26BK01393703-000
 * 당일(3/13) + 최근 7일 구간으로 호출.
 */

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getBidPblancListInfoServcPPSSrch, extractItems } from "@/lib/g2b/client";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const TEST_BID_NOS = ["R26BK01394152", "R26BK01393703"];
const INDUSTRY_CODE_1162 = "1162";
const INDUSTRY_NM_1162 = "건물위생관리업";

/** 26년 3월 13일 당일 00:00 ~ 23:59 */
function getDateRangeMar13(): { inqryBgnDt: string; inqryEndDt: string } {
  return {
    inqryBgnDt: "202603130000",
    inqryEndDt: "202603132359",
  };
}

/** 최근 7일 (오늘 기준) */
function getDateRangeLast7Days(): { inqryBgnDt: string; inqryEndDt: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    inqryBgnDt: `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}0000`,
    inqryEndDt: `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}2359`,
  };
}

function normNo(v: unknown): string {
  return String(v ?? "").trim().replace(/\s/g, "").replace(/-000$/i, "");
}

function fetchAllPages(
  dateRange: { inqryBgnDt: string; inqryEndDt: string },
  options: { inqryDiv: string; withIndustry: boolean }
) {
  const allItems: Record<string, unknown>[] = [];
  let totalCount = 0;
  let pageNo = 1;
  const numOfRows = 100;
  let resultCode: string | undefined;
  let resultMsg: string | undefined;

  const run = async () => {
    for (;;) {
      const data = await getBidPblancListInfoServcPPSSrch({
        inqryDiv: options.inqryDiv,
        ...dateRange,
        pageNo,
        numOfRows,
        ...(options.withIndustry
          ? { indstrytyCd: INDUSTRY_CODE_1162, indstrytyNm: INDUSTRY_NM_1162 }
          : {}),
      });
      const header = data.response?.header as { resultCode?: string; resultMsg?: string } | undefined;
      resultCode = header?.resultCode;
      resultMsg = header?.resultMsg;

      const items = extractItems(data);
      const list = Array.isArray(items) ? items : [items];
      const typed = list.filter((x): x is Record<string, unknown> => x != null && typeof x === "object") as Record<string, unknown>[];
      allItems.push(...typed);

      const body = data.response?.body as { totalCount?: string } | undefined;
      totalCount = parseInt(String(body?.totalCount ?? "0"), 10) || 0;

      if (typed.length < numOfRows || allItems.length >= totalCount) break;
      pageNo += 1;
      if (pageNo > 50) break;
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  return { run, getResult: () => ({ allItems, totalCount, resultCode, resultMsg }) };
}

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const dateRangeMar13 = getDateRangeMar13();
  const dateRangeLast7 = getDateRangeLast7Days();

  const checkBids = (items: Record<string, unknown>[]) => {
    const set = new Set(items.map((it) => normNo(it.bidNtceNo ?? it.bid_ntce_no)));
    return TEST_BID_NOS.map((no) => ({ bidNtceNo: no, inResult: set.has(normNo(no)) }));
  };

  try {
    // 1) 응답 body 구조 확인용 1회 호출 (당일+업종1162, 1페이지)
    let debugBody: Record<string, unknown> | null = null;
    try {
      const one = await getBidPblancListInfoServcPPSSrch({
        inqryDiv: "1",
        ...dateRangeMar13,
        pageNo: 1,
        numOfRows: 10,
        indstrytyCd: INDUSTRY_CODE_1162,
        indstrytyNm: INDUSTRY_NM_1162,
      });
      const body = one.response?.body as Record<string, unknown> | undefined;
      if (body) {
        debugBody = body;
      }
    } catch (_) {
      // ignore
    }

    const results: Record<string, { totalCount: number; fetchedCount: number; resultCode?: string; resultMsg?: string; testBidNos: { bidNtceNo: string; inResult: boolean }[]; sampleBidNtceNos: unknown[] }> = {};

    const ranges = [
      { key: "당일_3월13일", range: dateRangeMar13 },
      { key: "최근7일", range: dateRangeLast7 },
    ] as const;

    for (const { key, range } of ranges) {
      for (const withIndustry of [false, true]) {
        const run = fetchAllPages(range, { inqryDiv: "1", withIndustry });
        await run.run();
        const { allItems, totalCount, resultCode, resultMsg } = run.getResult();
        const label = withIndustry ? `${key}_업종1162` : `${key}_업종없음`;
        results[label] = {
          totalCount,
          fetchedCount: allItems.length,
          resultCode,
          resultMsg,
          testBidNos: checkBids(allItems),
          sampleBidNtceNos: allItems.slice(0, 15).map((it) => it.bidNtceNo ?? it.bid_ntce_no),
        };
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    const bodyShape =
      debugBody == null
        ? null
        : Object.fromEntries(
            Object.entries(debugBody).map(([k, v]) => [
              k,
              Array.isArray(v) ? `array(${v.length})` : v && typeof v === "object" ? `object(${Object.keys(v as object).join(",")})` : typeof v,
            ])
          );

    return NextResponse.json({
      ok: true,
      description: "getBidPblancListInfoServcPPSSrch · 26.3.13 기준 건물위생관리업 공고 2건 검사",
      testBidNos: TEST_BID_NOS,
      dateRangeMar13,
      dateRangeLast7,
      results,
      debugBodyKeys: debugBody ? Object.keys(debugBody) : null,
      debugBodyShape: bodyShape,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      ok: false,
      error: message,
    }, { status: 500 });
  }
}
