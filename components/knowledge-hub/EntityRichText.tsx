import type { ReactNode } from "react";
import Link from "next/link";
import { buildEntityLinkRegistry, type EntityLink } from "@/lib/knowledge-hub/entity-links";

type Props = {
  text: string;
  className?: string;
};

let registryCache: EntityLink[] | null = null;

function getRegistry(): EntityLink[] {
  if (!registryCache) registryCache = buildEntityLinkRegistry();
  return registryCache;
}

/** 본문 내 제품·재질·오염명을 한글 라벨로 자동 링크 */
export default function EntityRichText({ text, className }: Props) {
  const registry = getRegistry();
  const parts: ReactNode[] = [];
  let cursor = 0;

  type Match = { start: number; end: number; href: string; label: string };
  const matches: Match[] = [];

  for (const entry of registry) {
    let from = 0;
    while (from < text.length) {
      const idx = text.indexOf(entry.label, from);
      if (idx === -1) break;
      const end = idx + entry.label.length;
      const overlaps = matches.some((m) => !(end <= m.start || idx >= m.end));
      if (!overlaps) matches.push({ start: idx, end, href: entry.href, label: entry.label });
      from = end;
    }
  }

  matches.sort((a, b) => a.start - b.start);
  const merged: Match[] = [];
  for (const m of matches) {
    const last = merged[merged.length - 1];
    if (last && m.start < last.end) continue;
    merged.push(m);
  }

  for (const m of merged) {
    if (cursor < m.start) parts.push(text.slice(cursor, m.start));
    parts.push(
      <Link key={`${m.start}-${m.href}`} href={m.href} className="font-bold text-violet-800 underline decoration-violet-300 underline-offset-2 hover:text-violet-950">
        {m.label}
      </Link>
    );
    cursor = m.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <span className={className}>{parts}</span>;
}
