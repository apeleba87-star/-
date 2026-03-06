import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getBidPblancListInfoEorderAtchFileInfoRaw, extractItems } from "@/lib/g2b/client";

export const dynamic = "force-dynamic";

/**
 * 관리자 전용: 첨부파일 API 실제 응답 확인 (원인 분석용)
 * GET /api/debug/g2b-atch?tenderId=uuid
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tenderId = searchParams.get("tenderId");
  if (!tenderId) {
    return NextResponse.json({ error: "tenderId required" }, { status: 400 });
  }

  const { data: tender, error: tenderError } = await supabase
    .from("tenders")
    .select("id, bid_ntce_no, bid_ntce_ord")
    .eq("id", tenderId)
    .single();

  if (tenderError || !tender) {
    return NextResponse.json({ error: "Tender not found" }, { status: 404 });
  }

  if (!process.env.DATA_GO_KR_SERVICE_KEY) {
    return NextResponse.json({ error: "DATA_GO_KR_SERVICE_KEY not set" }, { status: 500 });
  }

  const bidNo = String(tender.bid_ntce_no ?? "");
  const bidOrdRaw = String(tender.bid_ntce_ord ?? "00");

  try {
    const { raw, parsed, httpStatus, baseUrlUsed } = await getBidPblancListInfoEorderAtchFileInfoRaw({
      bidNtceNo: bidNo,
      bidNtceOrd: bidOrdRaw,
      pageNo: 1,
      numOfRows: 200,
    });

    const header = parsed.response?.header as { resultCode?: string; resultMsg?: string } | undefined;
    const body = parsed.response?.body;
    const items = extractItems(parsed);
    const firstItem = items[0] as Record<string, unknown> | undefined;

    const possibleCauses: string[] = [];
    if (httpStatus === 404) {
      if (raw.includes("API not found")) {
        possibleCauses.push(`현재 base URL에서 'API not found' 반환됨. ${baseUrlUsed ?? ""} 경로에 이 오퍼레이션이 없거나, 인증키가 해당 서비스를 사용할 수 없음.`);
      }
      possibleCauses.push("getBidPblancListInfoEorderAtchFileInfo는 e발주 첨부 전용이라, 이 공고·인증키 조합에서는 미제공일 수 있음. 첨부는 '나라장터에서 공고번호로 검색'으로 이용하세요.");
    }
    if (httpStatus === 500 && raw.includes("Unexpected errors")) {
      possibleCauses.push("API 서버가 500 + 'Unexpected errors' 반환. 파라미터(bidNtceNo/bidNtceOrd) 형식이 해당 오퍼레이션 요구와 다르거나, 이 공고는 해당 API에서 미지원일 수 있음.");
      possibleCauses.push("공공데이터포털 API 문서에서 getBidPblancListInfoEorderAtchFileInfo의 요청 파라미터(공고번호·차수 형식)를 확인하세요.");
    }
    if (header?.resultCode === "PARSE_ERR" || header?.resultCode === "EMPTY") {
      possibleCauses.push("API가 빈 응답 또는 비정상 응답을 반환함. rawPreview로 실제 응답 확인.");
      possibleCauses.push("returnType=json 요청 시에도 공공데이터 API가 XML/에러 페이지를 반환할 수 있음.");
    }
    if (items.length === 0 && header?.resultCode === "00") {
      possibleCauses.push("getBidPblancListInfoEorderAtchFileInfo는 'e발주' 첨부파일만 지원합니다. 일반 용역 공고는 해당 없을 수 있음.");
      possibleCauses.push("공고번호/차수 형식이 API 요구와 다를 수 있음 (예: 차수 2자리 00, 01).");
    }
    if (header?.resultCode && header.resultCode !== "00" && header.resultCode !== "PARSE_ERR" && header.resultCode !== "EMPTY") {
      possibleCauses.push(`API resultCode: ${header.resultCode} — ${header.resultMsg ?? ""}`);
    }

    return NextResponse.json({
      request: {
        tenderId,
        bidNtceNo: bidNo,
        bidNtceOrdSent: (() => {
          const s = bidOrdRaw.replace(/\D/g, "").padStart(3, "0").slice(-3);
          return s;
        })(),
        bidNtceOrdRaw: bidOrdRaw,
      },
      response: {
        httpStatus,
        baseUrlUsed: baseUrlUsed ?? null,
        resultCode: header?.resultCode ?? null,
        resultMsg: header?.resultMsg ?? null,
        totalCount: (body as { totalCount?: number } | undefined)?.totalCount ?? null,
        itemsCount: items.length,
        firstItemKeys: firstItem ? Object.keys(firstItem) : null,
        firstItemSample: firstItem
          ? {
              fileSeq: firstItem.fileSeq ?? firstItem.file_seq ?? firstItem.파일순번,
              fileNm: firstItem.fileNm ?? firstItem.file_nm ?? firstItem.atchFileNm ?? firstItem.파일명,
            }
          : null,
      },
      possibleCauses: possibleCauses.length ? possibleCauses : null,
      rawLength: raw.length,
      rawPreview: raw.slice(0, 2000),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
