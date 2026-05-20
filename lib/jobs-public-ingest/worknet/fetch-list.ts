import { safeFetch, WORK24_ALLOWED_HOSTS } from "@/lib/safe-fetch";
import {
  WORKNET_LIST_API_URL,
  WORKNET_MAX_DISPLAY,
  WORKNET_FETCH_TIMEOUT_MS,
} from "./constants";
import { asXmlString, parseXmlRoot, xmlRows } from "./parse-xml";
import type { WorknetListItem, WorknetListParsed } from "./types";

function mapListRow(obj: Record<string, unknown>): WorknetListItem {
  return {
    wantedAuthNo: asXmlString(obj.wantedAuthNo),
    company: asXmlString(obj.company),
    busino: asXmlString(obj.busino),
    indTpNm: asXmlString(obj.indTpNm),
    title: asXmlString(obj.title),
    salTpNm: asXmlString(obj.salTpNm),
    sal: asXmlString(obj.sal),
    minSal: asXmlString(obj.minSal),
    maxSal: asXmlString(obj.maxSal),
    region: asXmlString(obj.region),
    holidayTpNm: asXmlString(obj.holidayTpNm),
    minEdubg: asXmlString(obj.minEdubg),
    maxEdubg: asXmlString(obj.maxEdubg),
    career: asXmlString(obj.career),
    regDt: asXmlString(obj.regDt),
    closeDt: asXmlString(obj.closeDt),
    infoSvc: asXmlString(obj.infoSvc),
    wantedInfoUrl: asXmlString(obj.wantedInfoUrl),
    wantedMobileInfoUrl: asXmlString(obj.wantedMobileInfoUrl),
    jobsCd: asXmlString(obj.jobsCd),
    empTpCd: asXmlString(obj.empTpCd),
  };
}

export function parseWorknetListXml(text: string): WorknetListParsed | null {
  const root = parseXmlRoot(text);
  if (!root) return null;
  const wantedRoot = (root.wantedRoot ?? root) as Record<string, unknown>;
  const total = Number(asXmlString(wantedRoot.total)) || 0;
  const startPage = Number(asXmlString(wantedRoot.startPage)) || 1;
  const display = Number(asXmlString(wantedRoot.display)) || 0;
  const items = xmlRows(wantedRoot.wanted, mapListRow).filter((r) => r.wantedAuthNo);
  return { total, startPage, display, items };
}

export function buildWorknetListUrl(opts: {
  authKey: string;
  startPage: number;
  display: number;
  keyword?: string;
  region?: string;
  regDate?: string;
}): string {
  const u = new URL(WORKNET_LIST_API_URL);
  u.searchParams.set("authKey", opts.authKey);
  u.searchParams.set("callTp", "L");
  u.searchParams.set("returnType", "XML");
  u.searchParams.set("startPage", String(Math.max(1, Math.min(1000, opts.startPage))));
  u.searchParams.set(
    "display",
    String(Math.max(1, Math.min(WORKNET_MAX_DISPLAY, opts.display)))
  );
  if (opts.keyword?.trim()) u.searchParams.set("keyword", opts.keyword.trim());
  if (opts.region?.trim()) u.searchParams.set("region", opts.region.trim());
  if (opts.regDate?.trim()) u.searchParams.set("regDate", opts.regDate.trim());
  return u.toString();
}

export async function fetchWorknetListPage(opts: {
  authKey: string;
  startPage: number;
  display?: number;
  keyword?: string;
  region?: string;
  regDate?: string;
}): Promise<WorknetListParsed> {
  const url = buildWorknetListUrl({
    authKey: opts.authKey,
    startPage: opts.startPage,
    display: opts.display ?? WORKNET_MAX_DISPLAY,
    keyword: opts.keyword,
    region: opts.region,
    regDate: opts.regDate,
  });
  const res = await safeFetch(url, {
    allowedHosts: WORK24_ALLOWED_HOSTS,
    timeoutMs: WORKNET_FETCH_TIMEOUT_MS,
    headers: { Accept: "application/xml, text/xml, */*" },
  });
  const text = await res.text();
  const parsed = parseWorknetListXml(text);
  if (!parsed) {
    throw new Error("워크넷 목록 XML 파싱 실패");
  }
  return parsed;
}
