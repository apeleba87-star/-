/** OAuth 콜백 실패 → 로그인 화면용 (내부 메시지는 노출하지 않음) */

const PKCE_HINT =
  "브라우저 쿠키가 차단되었거나 로그인 창이 바뀌었을 수 있습니다. Safari·Chrome에서 다시 시도해 주세요.";

export function oauthLoginErrorMessage(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  if (decoded === "auth") {
    return "카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  const lower = decoded.toLowerCase();
  if (
    lower.includes("pkce") ||
    lower.includes("code verifier") ||
    lower.includes("flow state") ||
    lower.includes("invalid grant")
  ) {
    return PKCE_HINT;
  }

  if (lower.includes("access_denied") || lower.includes("user denied")) {
    return "카카오 로그인이 취소되었습니다.";
  }

  // 개발·운영 디버그용 — Supabase/Kakao가 넘긴 짧은 메시지
  if (decoded.length <= 120 && !/^https?:\/\//i.test(decoded)) {
    return decoded;
  }

  return "카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}
