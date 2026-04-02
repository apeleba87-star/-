import type { User } from "@supabase/supabase-js";

/** Supabase Auth identity.provider → 관리자 표시용 */
const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일",
  google: "구글",
  kakao: "카카오",
};

export function formatAuthProvidersForAdmin(
  identities: { provider?: string }[] | null | undefined
): string {
  if (!identities?.length) return "—";
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const row of identities) {
    const p = (row.provider ?? "").trim();
    if (!p || seen.has(p)) continue;
    seen.add(p);
    labels.push(PROVIDER_LABEL[p] ?? p);
  }
  return labels.length ? labels.join(" · ") : "—";
}

/**
 * listUsers 등에서는 identities 가 비는 경우가 있어, 관리자 화면은 getUserById 결과에 사용.
 * identities 가 없으면 app_metadata.provider 를 보조로 사용.
 */
export function providerLabelFromAuthUser(user: User | null | undefined): string {
  if (!user) return "—";
  const fromIdentities = formatAuthProvidersForAdmin(user.identities);
  if (fromIdentities !== "—") return fromIdentities;
  const meta = user.app_metadata;
  if (meta && typeof meta === "object" && "provider" in meta) {
    const p = (meta as { provider?: unknown }).provider;
    if (typeof p === "string" && p.trim()) {
      return PROVIDER_LABEL[p] ?? p;
    }
  }
  return "—";
}
