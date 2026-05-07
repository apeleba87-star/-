/** 한글 UI용 계약 상태 라벨 (DB `contracts.status` 값 기준). */
export const CONTRACT_STATUS_LABEL_KO: Record<string, string> = {
  draft: "작성 중",
  owner_signed: "사장 서명 PDF 완료",
  sent: "거래처 서명 대기",
  client_signed: "거래처 서명 완료",
  completed: "계약 완료",
  cancelled: "취소",
};

export function contractStatusLabelKo(status: string): string {
  return CONTRACT_STATUS_LABEL_KO[status] ?? status;
}

function formatDateKo(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** 드롭다운 등에 쓰는 한 줄 요약 (거래처·현장·제목·상태·생성일). */
export function formatContractListOptionLabel(input: {
  client_name?: string | null;
  site_name?: string | null;
  title?: string | null;
  status: string;
  created_at?: string | null;
}): string {
  const client = input.client_name?.trim() || "거래처 미상";
  const parts = [client];
  const site = input.site_name?.trim();
  if (site) parts.push(site);
  const title = input.title?.trim();
  if (title) parts.push(title);
  const head = parts.join(" · ");
  const statusKo = contractStatusLabelKo(input.status);
  const date = formatDateKo(input.created_at);
  const tail = date ? `${statusKo} (${date})` : statusKo;
  return `${head} — ${tail}`;
}
