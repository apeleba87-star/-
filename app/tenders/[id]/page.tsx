import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import {
  extractItems,
  getBidPblancListInfoEorderAtchFileInfo,
  getBidPblancListInfoServcBsisAmount,
  getBidPblancListInfoPrtcptPsblRgn,
} from "@/lib/g2b/client";
import { getLowerRateFromRaw, calcLowerPrice, categoryLabel, shortRegion } from "@/lib/tender-utils";
import TenderBidSummary from "@/components/tender/TenderBidSummary";
import TenderBidStrategy from "@/components/tender/TenderBidStrategy";
import TenderBidSchedule from "@/components/tender/TenderBidSchedule";
import TenderBidExtraInfo from "@/components/tender/TenderBidExtraInfo";
import TenderDetailActionsWrapper from "@/components/tender/TenderDetailActionsWrapper";
import TenderDetailAwardBanner from "@/components/tender/TenderDetailAwardBanner";
import TenderRecommendationActions from "@/components/tender/TenderRecommendationActions";
import {
  fetchTenderAwardSummaryForDetail,
  resolveTenderDetailAwardBannerState,
} from "@/lib/tenders/tender-detail-award";
import { isValidSido } from "@/lib/tenders/user-focus";

export const revalidate = 60;

function pad3(v: unknown): string {
  const s = String(v ?? "0").replace(/\D/g, "") || "0";
  return s.padStart(3, "0");
}

function getTenderNumber(bidNo: string | null, bidOrd: string | null): string {
  if (!bidNo) return "";
  return `${bidNo}-${pad3(bidOrd ?? "0")}`;
}

function buildAtchDownloadUrl(params: { bidPbancNo: string; bidPbancOrd: string; fileSeq: string | number }): string {
  const search = new URLSearchParams({
    bidPbancNo: params.bidPbancNo,
    bidPbancOrd: pad3(params.bidPbancOrd),
    fileSeq: String(params.fileSeq),
    fileType: "",
  });
  return `https://www.g2b.go.kr/pn/pnp/pnpe/UntyAtchFile/downloadFile.do?${search.toString()}`;
}

function pickRawText(raw: unknown, keys: string[]): string | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  for (const k of keys) {
    const v = r[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function pickRawNumber(raw: unknown, keys: string[]): number | null {
  const s = pickRawText(raw, keys);
  if (s == null) return null;
  const n = Number(String(s).replace(/[^\d.-]/g, ""));
  return Number.isNaN(n) ? null : n;
}

const baseAmtKeys = [
  "bsisAmt", "BsisAmt", "base_amt", "기초금액", "추정가격", "예정가격", "estmtAmt", "estmt_amt",
  "asignBdgtAmt", "bdgtAmt", "배정예산금액", "예산금액", "presmtPrce", "presmt_prce",
];

/** API/raw에서 첨부파일 목록 추출 (다양한 필드명·구조 지원) */
function extractAttachList(attachFiles: unknown, raw: unknown): { fileSeq: string; fileName: string }[] {
  const fileSeqKeys = ["fileSeq", "file_seq", "FILE_SEQ", "atchFileSeq", "파일순번", "seq", "ord", "순번"];
  const fileNameKeys = ["fileNm", "file_nm", "fileName", "atchFileNm", "파일명", "파일이름", "atchFileNm", "atchFileName"];
  const pick = (obj: Record<string, unknown>, keys: string[]): string | null => {
    for (const k of keys) {
      const v = obj[k];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return null;
  };
  const toItem = (f: Record<string, unknown>, index: number): { fileSeq: string; fileName: string } | null => {
    const seq = pick(f, fileSeqKeys);
    const name = pick(f, fileNameKeys);
    if (!name && seq == null) return null;
    return {
      fileSeq: seq != null ? String(seq) : String(index + 1),
      fileName: name || `첨부파일 ${seq ?? index + 1}`,
    };
  };

  let list: Record<string, unknown>[] = [];
  if (Array.isArray(attachFiles)) {
    list = attachFiles as Record<string, unknown>[];
  } else if (attachFiles && typeof attachFiles === "object" && !Array.isArray(attachFiles)) {
    const o = attachFiles as Record<string, unknown>;
    if (Array.isArray(o.item)) list = o.item as Record<string, unknown>[];
    else if (Array.isArray(o.items)) list = o.items as Record<string, unknown>[];
    else if (o.item != null) list = [o.item as Record<string, unknown>];
  }
  let normalized = list.map((f, i) => toItem(f, i)).filter((x): x is { fileSeq: string; fileName: string } => x != null);
  if (normalized.length > 0) return normalized;

  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const fromList = r.atchFileList ?? r.fileList ?? r.첨부파일목록;
    const arr = Array.isArray(fromList) ? fromList : fromList && typeof fromList === "object" && Array.isArray((fromList as Record<string, unknown>).item)
      ? (fromList as { item: unknown[] }).item
      : null;
    if (arr?.length) {
      normalized = (arr as Record<string, unknown>[]).map((f, i) => toItem(f, i)).filter((x): x is { fileSeq: string; fileName: string } => x != null);
      if (normalized.length > 0) return normalized;
    }
    if (r.atchFileNm || r.fileNm || r.파일명) {
      const name = pick(r, fileNameKeys);
      if (name) return [{ fileSeq: "1", fileName: name }];
    }
  }
  return [];
}

export default async function TenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/tenders/${id}`)}`);
  }

  const supabase = createClient();
  const { data: tender, error } = await supabase.from("tenders").select("*").eq("id", id).single();
  if (error || !tender) notFound();

  const awardRow = await fetchTenderAwardSummaryForDetail(
    supabase,
    id,
    String(tender.bid_ntce_no ?? ""),
    String(tender.bid_ntce_ord ?? "00")
  );
  const awardBannerState = resolveTenderDetailAwardBannerState(
    {
      bid_clse_dt: (tender.bid_clse_dt as string | null) ?? null,
      openg_dt: (tender.openg_dt as string | null) ?? null,
      raw: tender.raw,
    },
    awardRow
  );
  const { data: tenderIndustryRows } = await supabase
    .from("tender_industries")
    .select("industry_code")
    .eq("tender_id", id);

  const { data: detail } = await supabase.from("tender_details").select("*").eq("tender_id", id).single();

  let attachFiles = (detail?.attach_files ?? null) as unknown;
  if (!attachFiles && process.env.DATA_GO_KR_SERVICE_KEY) {
    try {
      const data = await getBidPblancListInfoEorderAtchFileInfo({
        bidNtceNo: String(tender.bid_ntce_no ?? ""),
        bidNtceOrd: String(tender.bid_ntce_ord ?? "00"),
        pageNo: 1,
        numOfRows: 200,
      });
      const items = extractItems(data);
      attachFiles = items;
      await supabase.from("tender_details").upsert(
        { tender_id: id, attach_files: items, updated_at: new Date().toISOString() },
        { onConflict: "tender_id" }
      );
    } catch {
      // ignore
    }
  }

  const tenderNumber = getTenderNumber(tender.bid_ntce_no as string | null, tender.bid_ntce_ord as string | null);
  const bidNo = String(tender.bid_ntce_no ?? "");
  const bidOrd = String(tender.bid_ntce_ord ?? "00");

  const awardMethod =
    pickRawText(tender.raw, ["sucsfbidMthdNm", "sucsBidMthdNm", "sucs_bid_mthd_nm", "낙찰방법명", "낙찰방법"]) ?? "—";
  const bidMethod =
    pickRawText(tender.raw, ["bidMethdNm", "bidMthdNm", "bid_mthd_nm", "입찰방식명", "입찰방식"]) ?? "—";

  let regionText =
    (tender.bsns_dstr_nm as string)?.trim() ||
    pickRawText(tender.raw, ["bsnsDstrNm", "bsns_dstr_nm", "사업지역", "참가가능지역", "지역"]) ||
    "—";
  let baseAmt: number | null =
    tender.base_amt != null ? Number(tender.base_amt) : pickRawNumber(tender.raw, baseAmtKeys);

  if (process.env.DATA_GO_KR_SERVICE_KEY && (regionText === "—" || baseAmt == null)) {
    try {
      const [bsisRes, rgnRes] = await Promise.all([
        baseAmt == null ? getBidPblancListInfoServcBsisAmount({ bidNtceNo: bidNo, bidNtceOrd: bidOrd }) : null,
        regionText === "—" ? getBidPblancListInfoPrtcptPsblRgn({ bidNtceNo: bidNo, bidNtceOrd: bidOrd }) : null,
      ]);
      if (baseAmt == null && bsisRes) {
        const bsisItems = extractItems(bsisRes);
        const first = bsisItems[0] as Record<string, unknown> | undefined;
        if (first) {
          const amt = pickRawNumber(first, baseAmtKeys) ?? (typeof first.bsisAmt === "number" ? first.bsisAmt : null);
          if (amt != null) baseAmt = amt;
        }
      }
      if (regionText === "—" && rgnRes) {
        const rgnItems = extractItems(rgnRes) as Record<string, unknown>[];
        const names = rgnItems
          .map((r) =>
            pickRawText(r, ["prtcptPsblRgnNm", "prtcpt_psbl_rgn_nm", "regionNm", "region_nm", "지역명", "참가가능지역명", "지역"])
          )
          .filter(Boolean) as string[];
        if (names.length) regionText = [...new Set(names)].join(", ");
      }
    } catch {
      // ignore
    }
  }
  if (regionText === "—" && (tender.ntce_instt_nm as string)?.trim()) {
    regionText = (tender.ntce_instt_nm as string).trim();
  }

  const normalized = extractAttachList(attachFiles, tender.raw);

  const lowerRate = getLowerRateFromRaw(tender.raw);
  const lowerPrice = calcLowerPrice(baseAmt, lowerRate);
  const organ = (tender.ntce_instt_nm as string) || "—";
  const region = shortRegion(regionText);
  const categoryLabelText = categoryLabel(tender.categories as string[]);
  const recommendationIndustryCodes = [
    ...new Set((tenderIndustryRows ?? []).map((r) => String(r.industry_code ?? "").trim()).filter(Boolean)),
  ];
  const rawSidoList = Array.isArray((tender as { region_sido_list?: unknown }).region_sido_list)
    ? ((tender as { region_sido_list: unknown[] }).region_sido_list ?? [])
    : [];
  const recommendationRegionSido = rawSidoList.find((v) => isValidSido(typeof v === "string" ? v : null)) as
    | string
    | undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/20">
      <div className="mx-auto max-w-4xl px-4 py-6 md:py-12">
        <Link
          href="/tenders"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:translate-x-[-2px] hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          목록
        </Link>

        <TenderDetailAwardBanner state={awardBannerState} />
        <TenderRecommendationActions
          industryCodes={recommendationIndustryCodes}
          regionSido={recommendationRegionSido ?? null}
          regionGugun={null}
        />

        {/* [1] 핵심 요약 카드 */}
        <TenderBidSummary
        title={(tender.bid_ntce_nm as string) || "(제목 없음)"}
        organ={organ}
        region={region}
        categoryLabelText={categoryLabelText}
        basePrice={baseAmt}
        raw={tender.raw}
      />

        {/* [2] 행동 버튼 (CTA) */}
        <div className="mt-6">
          <TenderDetailActionsWrapper tenderNumber={tenderNumber} hasAttachments={normalized.length > 0} />
        </div>

        {/* [3] 입찰 전략 가격 */}
        <div className="mt-8">
          <TenderBidStrategy lowerPrice={lowerPrice} />
        </div>

        {/* [4] 일정 */}
        <div className="mt-6">
          <TenderBidSchedule
            bidNtceDt={tender.bid_ntce_dt as string | null}
            bidClseDt={tender.bid_clse_dt as string | null}
            opengDt={tender.openg_dt as string | null}
          />
        </div>

        {/* [5] 추가 정보 (접기) */}
        <div className="mt-6">
          <TenderBidExtraInfo
            qualReqSummary={(detail?.qual_req_summary as string) ?? null}
            regionText={regionText}
            bidMethod={bidMethod}
            awardMethod={awardMethod}
            extraItems={[]}
          />
        </div>

        {/* [6] 첨부파일 섹션 */}
        <section
          id="tender-attachments"
          className="mt-8 scroll-mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <FileText className="h-5 w-5 text-slate-500" aria-hidden />
            첨부파일
          </h2>
          <div className="mt-4 rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4">
            <p className="text-sm text-slate-700">
              첨부파일은 나라장터에서 확인할 수 있습니다. 공고번호를 복사한 뒤 나라장터에서 검색하세요.
            </p>
            <div className="mt-3 rounded-xl bg-white px-4 py-2.5 font-mono text-sm text-slate-800 shadow-sm">
              {tenderNumber || (tender.bid_ntce_no as string) || "—"}
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <TenderDetailActionsWrapper tenderNumber={tenderNumber} hasAttachments={normalized.length > 0} />
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
              <span aria-hidden>💡</span>
              <span>나라장터(g2b.go.kr) 접속 후 검색창에 공고번호를 붙여넣으면 원문·첨부파일을 확인할 수 있습니다.</span>
            </p>
          </div>
          {normalized.length > 0 && (
            <ul className="mt-4 space-y-2">
              {normalized.map((f) => {
                const url = buildAtchDownloadUrl({
                  bidPbancNo: String(tender.bid_ntce_no ?? ""),
                  bidPbancOrd: String(tender.bid_ntce_ord ?? "0"),
                  fileSeq: f.fileSeq,
                });
                return (
                  <li key={f.fileSeq}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 transition-all duration-200 hover:bg-slate-100 hover:shadow-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-800">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        <span className="line-clamp-1">{f.fileName || `첨부파일 #${f.fileSeq}`}</span>
                      </span>
                      <Download className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-blue-600" aria-hidden />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
