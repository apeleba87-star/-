/**
 * 나라장터 API 응답 item → tenders 테이블 행 매핑
 * (API 응답 필드명은 한글/영문 혼용 가능하므로 유연하게 매핑)
 */

export function mapItemToTender(row: Record<string, unknown>): Record<string, unknown> {
  const get = (keys: string[]) => {
    for (const k of keys) {
      const v = row[k];
      if (v != null && v !== "") return v;
    }
    return null;
  };
  const bidNo = String(get(["bidNtceNo", "bid_ntce_no", "공고번호"]) ?? "");
  const ord = String(get(["bidNtceOrd", "bid_ntce_ord", "공고차수"]) ?? "00");
  return {
    source: "g2b",
    bid_ntce_no: bidNo,
    bid_ntce_ord: ord,
    bid_ntce_nm: get(["bidNtceNm", "bid_ntce_nm", "공고명"]) ?? get(["bidNtceNm", "bid_ntce_nm"]),
    bid_ntce_dt: parseDate(get(["bidNtceDt", "bid_ntce_dt", "공고일시"])),
    bid_clse_dt: parseDate(get(["bidClseDt", "bid_clse_dt", "입찰마감일시", "투찰마감일시"])),
    openg_dt: parseDate(get(["opengDt", "openg_dt", "개찰일시"])),
    ntce_instt_nm: get(["ntceInsttNm", "ntce_instt_nm", "공고기관명", "계약기관명"]),
    dmand_instt_nm: get(["dmandInsttNm", "dmand_instt_nm", "수요기관명"]),
    cntrct_mthd_nm: get(["cntrctMthdNm", "cntrct_mthd_nm", "계약방법명"]),
    srvce_div_nm: get(["srvceDivNm", "srvce_div_nm", "업무구분명"]),
    prcure_obj_nm: get(["prcureObjNm", "prcure_obj_nm", "계약대상"]),
    bsns_dstr_nm: get(["bsnsDstrNm", "bsns_dstr_nm", "사업지역", "참가가능지역"]),
    base_amt: parseNum(get(["bsisAmt", "base_amt", "기초금액", "추정가격", "estmtAmt", "estmt_amt", "예정가격"])),
    estmt_amt: parseNum(get(["estmtAmt", "estmt_amt", "예정가격"])),
    ntce_url: buildNtceUrl(bidNo, ord),
    raw: row,
    updated_at: new Date().toISOString(),
  };
}

function parseDate(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const num = s.replace(/\D/g, "");
  if (num.length >= 8) {
    const y = num.slice(0, 4);
    const m = num.slice(4, 6);
    const d = num.slice(6, 8);
    const rest = num.length >= 14 ? `T${num.slice(8, 10)}:${num.slice(10, 12)}:${num.slice(12, 14)}` : "";
    return `${y}-${m}-${d}${rest ? rest + "Z" : ""}`;
  }
  return null;
}

function parseNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isNaN(n) ? null : n;
}

/** 나라장터 공고 상세 URL. bidNtceOrd는 2자리(00, 01…)로 보내야 404를 피할 수 있음. */
function buildNtceUrl(bidNo: string, ord: string): string {
  if (!bidNo) return "";
  const ord2 = String(ord ?? "00").padStart(2, "0");
  return `https://www.g2b.go.kr/ep/invitation/publish/bidPblancDtl.do?bidNtceNo=${encodeURIComponent(bidNo)}&bidNtceOrd=${encodeURIComponent(ord2)}`;
}

/** 공고번호·공고차수로 나라장터 원문 URL 생성 (상세 페이지 등에서 사용) */
export function getNtceDetailUrl(bidNo: string | null, bidOrd: string | null): string {
  if (!bidNo) return "";
  return buildNtceUrl(bidNo, String(bidOrd ?? "00"));
}

/** 공고명/내용에 키워드가 하나라도 포함되면 매칭 */
export function matchKeywords(
  text: string,
  keywords: string[]
): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return keywords.filter((k) => lower.includes(k.toLowerCase()));
}
