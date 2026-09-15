import {
  ANSWERS_COOLDOWN_SEC,
  ANSWERS_DAILY_LIMIT,
  QUESTIONS_COOLDOWN_SEC,
  QUESTIONS_DAILY_LIMIT,
  QUESTIONS_NEW_ACCOUNT_DAILY_LIMIT,
  QUESTIONS_NEW_ACCOUNT_DAYS,
} from "@/lib/questions/constants";
import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

function startOfKstDayIso(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return new Date(`${y}-${m}-${d}T00:00:00+09:00`).toISOString();
}

function isNewAccount(createdAt: string | null | undefined): boolean {
  if (!createdAt) return true;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return true;
  const ageMs = Date.now() - created;
  return ageMs < QUESTIONS_NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000;
}

type RateLimitClient = SupabaseClient;

async function resolveClient(
  client?: RateLimitClient,
): Promise<RateLimitClient> {
  return client ?? (await createServerSupabase());
}

/**
 * 일일 한도·쿨다운 유지.
 * 프로필 1회 + 최근 글 N건 1회로 검사 (이전 3~4회 왕복 → 2회).
 */
export async function assertCanPostQuestion(
  userId: string,
  client?: RateLimitClient,
): Promise<{ ok: true; dailyLimit: number } | { ok: false; error: string }> {
  const supabase = await resolveClient(client);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, questions_suspended_at, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.questions_suspended_at) {
    return { ok: false, error: "질문 작성이 정지된 계정입니다." };
  }

  const isStaff =
    profile?.role === "admin" || profile?.role === "editor";
  if (isStaff) return { ok: true, dailyLimit: 999 };

  const dailyLimit = isNewAccount(profile?.created_at)
    ? QUESTIONS_NEW_ACCOUNT_DAILY_LIMIT
    : QUESTIONS_DAILY_LIMIT;

  const since = startOfKstDayIso();
  const { data: recent, error } = await supabase
    .from("questions")
    .select("created_at")
    .eq("author_id", userId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(dailyLimit);

  if (error) {
    return {
      ok: false,
      error: "작성 한도를 확인할 수 없습니다. 잠시 후 다시 시도하세요.",
    };
  }

  const rows = recent ?? [];
  const todayCount = rows.filter((r) => String(r.created_at) >= since).length;
  if (todayCount >= dailyLimit) {
    return {
      ok: false,
      error: `하루 질문 한도(${dailyLimit}개)에 도달했습니다. 내일 다시 작성해 주세요.`,
    };
  }

  const lastAt = rows[0]?.created_at ? String(rows[0].created_at) : null;
  if (lastAt) {
    const elapsed = (Date.now() - new Date(lastAt).getTime()) / 1000;
    if (elapsed < QUESTIONS_COOLDOWN_SEC) {
      const wait = Math.ceil(QUESTIONS_COOLDOWN_SEC - elapsed);
      return {
        ok: false,
        error: `연속 작성 제한: ${wait}초 후에 다시 시도해 주세요.`,
      };
    }
  }

  return { ok: true, dailyLimit };
}

export async function assertCanPostAnswer(
  userId: string,
  client?: RateLimitClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await resolveClient(client);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, questions_suspended_at")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.questions_suspended_at) {
    return { ok: false, error: "답변 작성이 정지된 계정입니다." };
  }

  const isStaff =
    profile?.role === "admin" || profile?.role === "editor";
  if (isStaff) return { ok: true };

  const since = startOfKstDayIso();
  const { data: recent, error } = await supabase
    .from("question_answers")
    .select("created_at")
    .eq("author_id", userId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(ANSWERS_DAILY_LIMIT);

  if (error) {
    return {
      ok: false,
      error: "작성 한도를 확인할 수 없습니다. 잠시 후 다시 시도하세요.",
    };
  }

  const rows = recent ?? [];
  const todayCount = rows.filter((r) => String(r.created_at) >= since).length;
  if (todayCount >= ANSWERS_DAILY_LIMIT) {
    return {
      ok: false,
      error: `하루 답변 한도(${ANSWERS_DAILY_LIMIT}개)에 도달했습니다.`,
    };
  }

  const lastAt = rows[0]?.created_at ? String(rows[0].created_at) : null;
  if (lastAt) {
    const elapsed = (Date.now() - new Date(lastAt).getTime()) / 1000;
    if (elapsed < ANSWERS_COOLDOWN_SEC) {
      const wait = Math.ceil(ANSWERS_COOLDOWN_SEC - elapsed);
      return {
        ok: false,
        error: `연속 작성 제한: ${wait}초 후에 다시 시도해 주세요.`,
      };
    }
  }

  return { ok: true };
}
