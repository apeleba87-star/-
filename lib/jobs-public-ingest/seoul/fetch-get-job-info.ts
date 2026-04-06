import { safeFetch, SEOUL_OPENAPI_ALLOWED_HOSTS } from "@/lib/safe-fetch";
import { parseSeoulGetJobInfoResponse, type SeoulGetJobInfoParsed } from "./parse-get-job-info";

const DEFAULT_BASE = "http://openapi.seoul.go.kr:8088";

export type SeoulResponseFormat = "xml" | "json";

export function buildSeoulGetJobInfoUrl(opts: {
  apiKey: string;
  startIndex: number;
  endIndex: number;
  format: SeoulResponseFormat;
  baseUrl?: string;
}): string {
  const base = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
  const key = encodeURIComponent(opts.apiKey);
  const { startIndex, endIndex, format } = opts;
  if (startIndex < 1 || endIndex < startIndex || endIndex - startIndex > 999) {
    throw new Error("Seoul GetJobInfo: START/END 범위는 1 이상, 구간 길이 1000 이하여야 합니다.");
  }
  return `${base}/${key}/${format}/GetJobInfo/${startIndex}/${endIndex}`;
}

const FETCH_TIMEOUT_MS = 90_000;

export async function fetchSeoulGetJobInfoPage(opts: {
  apiKey: string;
  startIndex: number;
  endIndex: number;
  format?: SeoulResponseFormat;
  baseUrl?: string;
}): Promise<SeoulGetJobInfoParsed> {
  const format = opts.format ?? "xml";
  const url = buildSeoulGetJobInfoUrl({
    apiKey: opts.apiKey,
    startIndex: opts.startIndex,
    endIndex: opts.endIndex,
    format,
    baseUrl: opts.baseUrl,
  });
  const res = await safeFetch(url, {
    allowedHosts: SEOUL_OPENAPI_ALLOWED_HOSTS,
    timeoutMs: FETCH_TIMEOUT_MS,
    headers: { Accept: format === "json" ? "application/json" : "application/xml, text/xml, */*" },
  });
  const text = await res.text();
  return parseSeoulGetJobInfoResponse(text);
}
