/**
 * SSRF 방지 + 타임아웃: 외부 API 호출 시 허용 host만 요청, 응답 지연 시 worker block 방지
 * 사용처: G2B(data.go.kr), Bootpay 등 서버에서 호출하는 fetch
 */

const DEFAULT_TIMEOUT_MS = 5000;

function getHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    return "";
  }
}

export type SafeFetchOptions = RequestInit & {
  /** 허용할 host (소문자, 예: 'apis.data.go.kr', 'api.bootpay.co.kr') */
  allowedHosts: string[];
  /** 타임아웃(ms). 기본 5초 */
  timeoutMs?: number;
};

/**
 * allowedHosts에 포함된 host로만 요청. 그 외 URL이면 throw.
 * AbortSignal.timeout으로 지정 시간 초과 시 중단.
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions
): Promise<Response> {
  const { allowedHosts, timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
  const host = getHost(url);
  const allowed = new Set(allowedHosts.map((h) => h.toLowerCase()));
  if (!host || !allowed.has(host)) {
    throw new Error(`safeFetch: URL host "${host}" is not in allowedHosts [${[...allowed].join(", ")}]`);
  }
  const signal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = init.signal
    ? (() => {
        const c = new AbortController();
        init.signal?.addEventListener("abort", () => c.abort());
        signal.addEventListener("abort", () => c.abort());
        return c.signal;
      })()
    : signal;
  return fetch(url, { ...init, signal: combinedSignal });
}

/** G2B 공공데이터포털 API 허용 host */
export const G2B_ALLOWED_HOSTS = ["apis.data.go.kr"];

/** Bootpay API 허용 host (백엔드 SDK가 호출하는 도메인) */
export const BOOTPAY_ALLOWED_HOSTS = ["api.bootpay.co.kr"];
