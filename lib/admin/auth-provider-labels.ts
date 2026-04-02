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
