/**
 * 관리자 전용: 기초금액 API 기간+페이지 조회 테스트.
 * getBidPblancListInfoServcBsisAmount를 inqryBgnDt·inqryEndDt만으로 호출해 여러 건이 오는지 확인.
 */

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getBidPblancListInfoServcBsisAmountByRange, extractItems } from "@/lib/g2b/client";

export const dynamic = "force-dynamic";

function get1DayRange(): { inqryBgnDt: string; inqryEndDt: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 1);
  return {
    inqryBgnDt: `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}0000`,
    inqryEndDt: `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}2359`,
  };
}

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.DATA_GO_KR_SERVICE_KEY?.trim()) {
    return NextResponse.json({ ok: false, error: "DATA_GO_KR_SERVICE_KEY 없음" }, { status: 500 });
  }

  const range = get1DayRange();
  try {
    const data = await getBidPblancListInfoServcBsisAmountByRange({
      ...range,
      pageNo: 1,
      numOfRows: 100,
      inqryDiv: "1",
    });
    const items = extractItems(data);
    const totalCount = (data.response?.body as { totalCount?: number } | undefined)?.totalCount ?? items.length;
    const firstItem = (items[0] as Record<string, unknown>) ?? {};
    const firstItemKeys = Object.keys(firstItem);
    const sample = items.slice(0, 5).map((it: Record<string, unknown>) => ({
      bidNtceNo: it.bidNtceNo ?? it.bid_ntce_no,
      bidNtceOrd: it.bidNtceOrd ?? it.bid_ntce_ord,
      bidNtceNm: it.bidNtceNm ?? it.bid_ntce_nm,
      bsisAmt: it.bsisAmt ?? it.기초금액 ?? it.base_amt,
      presmptPrce: it.presmptPrce ?? it.추정가격,
    }));

    return NextResponse.json({
      ok: true,
      message: "기초금액 API 기간+페이지 조회 (bidNtceNo 없이)",
      range: { inqryBgnDt: range.inqryBgnDt, inqryEndDt: range.inqryEndDt },
      totalCount,
      itemsInPage: items.length,
      firstItemKeys,
      firstItemRaw: firstItem,
      sample,
      rawHeader: data.response?.header,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      ok: false,
      error: message,
      range: { inqryBgnDt: range.inqryBgnDt, inqryEndDt: range.inqryEndDt },
    }, { status: 200 });
  }
}
