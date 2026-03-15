/**
 * 면허제한 API 1건 테스트 (공고번호로 직접 호출).
 * 사용: node --env-file=.env.local scripts/test-license-api.mjs R26BK01393703
 * 또는: node --env-file=.env.local scripts/test-license-api.mjs R26BK01393703 00
 */
const bidNtceNo = process.argv[2] || "R26BK01393703";
const bidNtceOrd = (process.argv[3] || "00").padStart(2, "0");
const key = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
if (!key) {
  console.error("DATA_GO_KR_SERVICE_KEY not set. Use: node --env-file=.env.local scripts/test-license-api.mjs", bidNtceNo);
  process.exit(1);
}

const pad = (n) => String(n).padStart(2, "0");
const end = new Date();
const start = new Date();
start.setDate(start.getDate() - 7);
const inqryBgnDt = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}0000`;
const inqryEndDt = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}2359`;

const base = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";

async function run() {
  // 1) 공고번호만 (날짜 없이) 호출 시도
  console.log("\n=== Without date range (bidNtceNo only) ===");
  const nosNoDate = bidNtceNo.includes("-") ? [bidNtceNo] : [bidNtceNo, `${bidNtceNo}-000`];
  for (const no of nosNoDate) {
    const p = new URLSearchParams({ returnType: "json", pageNo: "1", numOfRows: "100", inqryDiv: "1", bidNtceNo: no, bidNtceOrd });
    const u = `${base}/getBidPblancListInfoLicenseLimit?serviceKey=${key}&${p}`;
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(10000) });
      const text = await res.text();
      console.log(no, "Status:", res.status, "Body start:", text.slice(0, 300));
    } catch (e) {
      console.log(no, "Error:", e.message);
    }
  }
  // 2) 7일 구간에서 페이지 돌며 R26BK01393703 찾기 (API가 bidNtceNo 필터를 안 함)
  console.log("\n=== Search for", bidNtceNo, "in 7-day range (paginate) ===");
  const wantNo = bidNtceNo.replace(/-000$/, "");
  const normOrd = (v) => String(v ?? "").replace(/\D/g, "").padStart(2, "0");
  const { XMLParser } = await import("fast-xml-parser");
  const parser = new XMLParser({ ignoreDeclaration: true });
  let totalCount = 0;
  for (let pageNo = 1; pageNo <= 200; pageNo++) {
    const p = new URLSearchParams({ returnType: "json", pageNo: String(pageNo), numOfRows: "100", inqryDiv: "1", inqryBgnDt, inqryEndDt });
    const u = `${base}/getBidPblancListInfoLicenseLimit?serviceKey=${key}&${p}`;
    const res = await fetch(u, { signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    if (!res.ok) {
      console.log("Page", pageNo, "Status", res.status);
      break;
    }
    let list = [];
    let body;
    if (text.trim().startsWith("<")) {
      const raw = parser.parse(text);
      const r = raw?.response?.body ?? raw?.body;
      const fromItems = r?.items?.item ?? r?.item;
      list = fromItems != null ? (Array.isArray(fromItems) ? fromItems : [fromItems]) : [];
      body = r;
    } else {
      const data = JSON.parse(text);
      body = data?.response?.body ?? data?.body;
      const items = body?.items?.item ?? body?.item;
      list = items == null ? [] : Array.isArray(items) ? items : [items];
    }
    if (pageNo === 1) totalCount = body?.totalCount ?? list.length;
    const found = list.filter((it) => String(it.bidNtceNo || "").replace(/-/g, "") === wantNo.replace(/-/g, "") && normOrd(it.bidNtceOrd) === bidNtceOrd);
    if (found.length > 0) {
      console.log("FOUND on page", pageNo, "!");
      found.forEach((it) => {
        console.log("  bidNtceNo:", it.bidNtceNo, "bidNtceOrd:", it.bidNtceOrd);
        console.log("  lcnsLmtNm:", it.lcnsLmtNm);
        console.log("  permsnIndstrytyList:", it.permsnIndstrytyList);
        console.log("  indstrytyMfrcFldList:", it.indstrytyMfrcFldList);
        const raw = [it.lcnsLmtNm, it.permsnIndstrytyList, it.indstrytyMfrcFldList].join(" ");
        if (raw.includes("1162")) console.log("  >>> 1162 found in this item");
      });
      break;
    }
    if (list.length === 0) {
      console.log("Page", pageNo, "empty, stop.");
      break;
    }
    if (pageNo <= 3 || pageNo % 50 === 0) console.log("Page", pageNo, "totalCount", totalCount, "checked", pageNo * 100);
  }
}
run();
