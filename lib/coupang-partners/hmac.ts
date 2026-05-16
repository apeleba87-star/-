import { createHmac } from "crypto";

const API_PREFIX = "/v2/providers/affiliate_open_api/apis/openapi/v1";

/** GMT signed-date: YYMMDDTHHMMSSZ */
export function coupangSignedDate(now = new Date()): string {
  return now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
    .slice(2);
}

/** path는 /v2/providers/... 부터, query는 ? 없이 */
export function buildCoupangAuthorization(
  method: string,
  pathWithOptionalQuery: string,
  accessKey: string,
  secretKey: string,
  now = new Date()
): string {
  const [pathOnly, query = ""] = pathWithOptionalQuery.split("?");
  const datetime = coupangSignedDate(now);
  const message = datetime + method.toUpperCase() + pathOnly + query;
  const signature = createHmac("sha256", secretKey).update(message).digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

export function coupangApiPath(relativePath: string, query?: Record<string, string | number | undefined>): string {
  const base = relativePath.startsWith(API_PREFIX) ? relativePath : `${API_PREFIX}${relativePath.startsWith("/") ? "" : "/"}${relativePath}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export const COUPANG_API_GATEWAY = "https://api-gateway.coupang.com";
