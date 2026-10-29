/**
 * Supabase Auth 등에서 오는 영문 오류를 로그인·가입 UI용 한글로 바꾼다.
 * 알 수 없는 영문 메시지는 일반 안내로 대체해 영어가 그대로 노출되지 않게 한다.
 */

const FALLBACK = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

/** 알려진 문구·부분 문자열 → 한글 (먼저 매칭된 것 사용) */
const RULES: { test: RegExp | string; message: string }[] = [
  { test: /invalid login credentials/i, message: "이메일 또는 비밀번호가 올바르지 않습니다." },
  { test: /invalid email or password/i, message: "이메일 또는 비밀번호가 올바르지 않습니다." },
  { test: /email not confirmed/i, message: "이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요." },
  { test: /user already registered/i, message: "이미 가입된 이메일입니다. 로그인해 주세요." },
  { test: /user not found/i, message: "해당 계정을 찾을 수 없습니다." },
  { test: /password should be at least/i, message: "비밀번호는 6자 이상이어야 합니다." },
  { test: /password is too short/i, message: "비밀번호가 너무 짧습니다." },
  { test: /weak_password|password is known to be weak|easy to guess/i, message: "비밀번호가 너무 단순합니다. 더 복잡한 비밀번호를 사용해 주세요." },
  { test: /password contains user information/i, message: "비밀번호에 이메일·이름 등 개인정보가 포함될 수 없습니다." },
  { test: /new password should be different/i, message: "이전과 다른 비밀번호를 입력해 주세요." },
  { test: /unable to validate email|invalid.*email|email address.*invalid/i, message: "이메일 형식이 올바르지 않습니다." },
  { test: /email rate limit|over_email_send_rate_limit/i, message: "이메일 발송이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
  { test: /over_request_rate_limit|rate limit/i, message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
  { test: /for security purposes, you can only request this after/i, message: "보안을 위해 잠시 후 다시 시도해 주세요." },
  { test: /signup is disabled/i, message: "현재 회원가입이 중단되어 있습니다." },
  { test: /provider is not enabled|unsupported provider/i, message: "해당 로그인 방식을 사용할 수 없습니다." },
  { test: /identity is already linked/i, message: "이미 연결된 계정입니다." },
  { test: /user_banned|user is banned/i, message: "이용이 제한된 계정입니다." },
  { test: /captcha/i, message: "보안 확인에 실패했습니다. 다시 시도해 주세요." },
  { test: /email link is invalid|token has expired|otp_expired|token.*invalid/i, message: "인증 링크가 만료되었거나 올바르지 않습니다. 다시 요청해 주세요." },
  { test: /auth session missing/i, message: "로그인 세션이 없습니다. 다시 로그인해 주세요." },
  { test: /database error saving new user/i, message: "계정 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
  { test: /error sending confirmation email|error sending.*email/i, message: "인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." },
  { test: /network|failed to fetch|fetch failed/i, message: "네트워크 오류가 발생했습니다. 연결을 확인해 주세요." },
];

function looksKorean(text: string): boolean {
  return /[가-힣]/.test(text);
}

export function authErrorMessage(raw: string | null | undefined, fallback = FALLBACK): string {
  if (!raw) return fallback;

  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded).trim();
  } catch {
    /* keep decoded */
  }
  if (!decoded) return fallback;

  for (const rule of RULES) {
    const matched =
      typeof rule.test === "string"
        ? decoded.toLowerCase().includes(rule.test.toLowerCase())
        : rule.test.test(decoded);
    if (matched) return rule.message;
  }

  // 이미 한글이면 그대로 (앱에서 만든 메시지)
  if (looksKorean(decoded) && decoded.length <= 200) return decoded;

  return fallback;
}
