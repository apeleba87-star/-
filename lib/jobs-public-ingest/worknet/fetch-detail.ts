import { safeFetch, WORK24_ALLOWED_HOSTS } from "@/lib/safe-fetch";
import { WORKNET_DETAIL_API_URL, WORKNET_FETCH_TIMEOUT_MS, WORKNET_INFO_SVC } from "./constants";
import { asXmlString, parseXmlRoot } from "./parse-xml";

export function buildWorknetDetailUrl(opts: { authKey: string; wantedAuthNo: string }): string {
  const u = new URL(WORKNET_DETAIL_API_URL);
  u.searchParams.set("authKey", opts.authKey);
  u.searchParams.set("callTp", "D");
  u.searchParams.set("returnType", "XML");
  u.searchParams.set("wantedAuthNo", opts.wantedAuthNo.trim());
  u.searchParams.set("infoSvc", WORKNET_INFO_SVC);
  return u.toString();
}

export async function fetchWorknetDetail(opts: {
  authKey: string;
  wantedAuthNo: string;
}): Promise<Record<string, unknown> | null> {
  const url = buildWorknetDetailUrl(opts);
  const res = await safeFetch(url, {
    allowedHosts: WORK24_ALLOWED_HOSTS,
    timeoutMs: WORKNET_FETCH_TIMEOUT_MS,
    headers: { Accept: "application/xml, text/xml, */*" },
  });
  const text = await res.text();
  const root = parseXmlRoot(text);
  if (!root) return null;
  const dtl = root.wantedDtl ?? root;
  return typeof dtl === "object" && dtl !== null ? (dtl as Record<string, unknown>) : null;
}

export function wantedInfoFromDetail(detail: Record<string, unknown>): Record<string, string> {
  const info = detail.wantedInfo;
  if (!info || typeof info !== "object") return {};
  const o = info as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    out[k] = asXmlString(v);
  }
  return out;
}
