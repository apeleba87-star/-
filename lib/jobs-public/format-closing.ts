import { closingLabel } from "@/lib/jobs-public-ingest/worknet/closing-parse";

export function formatClosingPrimary(closingAt: string | null | undefined, now = new Date()): string {
  if (!closingAt) return "채용시까지";
  const d = new Date(closingAt);
  if (Number.isNaN(d.getTime())) return "채용시까지";
  return closingLabel(d, now);
}

export function formatClosingDateLine(closingAt: string | null | undefined): string | null {
  if (!closingAt) return null;
  const d = new Date(closingAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatClosingCardMeta(
  closingAt: string | null | undefined,
  now = new Date()
): string {
  const primary = formatClosingPrimary(closingAt, now);
  const dateLine = formatClosingDateLine(closingAt);
  if (dateLine && !primary.includes("채용시")) {
    return `${primary} · ${dateLine}`;
  }
  return primary;
}
