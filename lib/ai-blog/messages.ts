const MESSAGES: Record<string, string> = {
  auth_required: "로그인이 필요합니다.",
  business_profile_required: "업체 프로필을 먼저 등록해 주세요.",
  admin_required: "업체 대표(관리자) 계정만 사용할 수 있습니다.",
  business_name_required: "업체명을 입력해 주세요.",
  service_type_required: "서비스 종류를 선택해 주세요.",
  keyword_required: "메인 키워드를 입력해 주세요.",
  project_not_found: "현장을 찾을 수 없습니다.",
  content_not_found: "초안을 찾을 수 없습니다.",
  paragraph_not_found: "다시 쓸 문단을 찾을 수 없습니다.",
  monthly_limit_reached: "이번 달 블로그 작성 한도를 모두 사용했습니다.",
  generation_limit_reached: "이 초안의 AI 생성 횟수를 모두 사용했습니다. 직접 수정은 계속 가능합니다.",
  rewrite_limit_reached: "이 초안의 문단 다시쓰기 횟수를 모두 사용했습니다.",
  generation_in_progress: "AI가 이미 작성 중입니다. 잠시만 기다려 주세요.",
  generate_first: "먼저 AI 초안을 생성해 주세요.",
  openai_not_configured: "AI 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.",
  openai_timeout: "AI 응답이 늦어 중단했습니다. 횟수는 차감되지 않았습니다. 다시 시도해 주세요.",
  openai_rate_limited: "AI 요청이 몰려 있습니다. 잠시 후 다시 시도해 주세요. 횟수는 차감되지 않았습니다.",
  too_many_media: "사진은 현장당 최대 80장까지 정렬할 수 있습니다.",
  too_many_pairs: "전후 짝은 현장당 최대 40개까지 만들 수 있습니다.",
  ai_access_none: "AI 블로그 사용 권한이 없습니다. 클린아이덱스 관리자에게 문의해 주세요.",
  ai_access_required: "AI 블로그 사용 권한이 없습니다. 클린아이덱스 관리자에게 문의해 주세요.",
  ai_access_expired: "AI 블로그 이용 기간이 끝났습니다. 기존 글 보기와 네이버로 옮기기만 가능합니다.",
  ai_access_suspended: "AI 블로그 사용이 정지되었습니다. 클린아이덱스 관리자에게 문의해 주세요.",
  site_admin_required: "사이트 관리자만 사용할 수 있습니다.",
  user_not_found: "해당 이메일로 가입한 회원을 찾을 수 없습니다.",
  access_not_found: "아직 권한이 부여되지 않은 회원입니다.",
  plan_not_found: "요금제를 찾을 수 없습니다.",
  invalid_date: "날짜 형식이 올바르지 않습니다.",
  invalid_period: "기간을 선택해 주세요.",
};

export function errorMessage(code: string | null | undefined): string {
  if (!code) return "알 수 없는 오류가 발생했습니다.";
  if (MESSAGES[code]) return MESSAGES[code];
  if (code.startsWith("openai_")) return "AI 작성 중 오류가 발생했습니다. 횟수는 차감되지 않았습니다. 다시 시도해 주세요.";
  return `요청을 처리하지 못했습니다. (${code})`;
}

export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => ({ ok: false, error: `http_${res.status}` }))) as {
    ok: boolean;
    data?: T;
    error?: string;
  };
  if (!json.ok) throw new Error(errorMessage(json.error));
  return json.data as T;
}
