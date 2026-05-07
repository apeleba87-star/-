import type { SupabaseClient } from "@supabase/supabase-js";

/** 관리자가 아닌 사용자에게 보여줄 이메일 마스킹 (본인은 원문 유지). */
export function maskEmailForOthers(email: string | null): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain) return "***";
  if (local.length <= 2) return `***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Auth Admin getUserById 를 청크 단위 병렬 호출 (전역 listUsers 로는 회사 멤버를 찾을 수 없음).
 * 청크 크기는 Auth API rate limit 을 고려해 보수적으로 둠.
 */
export async function fetchAuthEmailsByUserIds(
  service: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const unique = Array.from(new Set(userIds));
  const chunkSize = 12;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const results = await Promise.all(
      chunk.map(async (id) => {
        const { data, error } = await service.auth.admin.getUserById(id);
        if (error) return [id, null] as const;
        const email = (data?.user as { email?: string | null } | undefined)?.email ?? null;
        return [id, email] as const;
      })
    );
    for (const [id, email] of results) map.set(id, email);
  }
  return map;
}
