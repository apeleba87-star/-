/** 마감앱 Flutter 웹(로컬·스테이징) → API cross-origin */

const MAGAM_CORS_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isMagamCorsOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return MAGAM_CORS_ORIGIN_RE.test(origin);
}

export function magamCorsHeaders(origin: string | null): HeadersInit {
  if (!isMagamCorsOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

export function withMagamCors(
  response: Response,
  origin: string | null
): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(magamCorsHeaders(origin))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
