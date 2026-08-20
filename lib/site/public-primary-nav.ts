import {
  Beaker,
  BookOpen,
  Briefcase,
  ClipboardList,
  Droplets,
  FileText,
  FlaskConical,
  Gavel,
  Handshake,
  Home,
  Landmark,
  Layers,
  Radio,
  Sparkles,
  Trophy,
  UserPlus,
  Calculator,
} from "lucide-react";
import { KNOWLEDGE_NAV, PRACTICE_NAV } from "@/lib/edu-blog/constants";
import { magamLiveHref, MAGAM_LIVE_FROM_CLEANIDEX } from "@/lib/magam/live-entry";

export type NavItem = {
  href: string;
  label: string;
  Icon: typeof Home;
  shortLabel?: string;
  adminOnly?: boolean;
};

export type NavSubItem = {
  href?: string;
  label: string;
  Icon: typeof Home;
  disabled?: boolean;
};

export type NavColumn = { title: string; items: NavSubItem[] };

export type NavGroup = {
  kind: "group";
  label: string;
  shortLabel?: string;
  Icon: typeof Home;
  items: NavSubItem[];
  adminOnly?: boolean;
};

export type NavMegaGroup = {
  kind: "mega";
  label: string;
  shortLabel?: string;
  Icon: typeof Home;
  columns: NavColumn[];
};

export type PrimaryNavLink = { kind: "link"; adminOnly?: boolean } & NavItem;

export type PrimaryNavEntry = PrimaryNavLink | NavGroup | NavMegaGroup;

/** 렌더용: 청소지식·청소업 실무는 한 덩어리로 붙여서 줄바꿈돼도 서로 아래로 안 떨어지게 한다. */
export type ClusteredPrimaryNavEntry =
  | PrimaryNavEntry
  | { kind: "siblingCluster"; items: PrimaryNavLink[] };

const SIBLING_LABELS = [KNOWLEDGE_NAV.label, PRACTICE_NAV.label] as const;

export function isKnowledgeOrPracticeLabel(label: string): boolean {
  return (SIBLING_LABELS as readonly string[]).includes(label);
}

function isSiblingLabel(label: string): boolean {
  return isKnowledgeOrPracticeLabel(label);
}

export function knowledgePracticeHref(label: string): string | null {
  if (label === KNOWLEDGE_NAV.label) return KNOWLEDGE_NAV.href;
  if (label === PRACTICE_NAV.label) return PRACTICE_NAV.href;
  return null;
}

export function clusterKnowledgePracticeLinks(
  items: PrimaryNavEntry[],
): ClusteredPrimaryNavEntry[] {
  const out: ClusteredPrimaryNavEntry[] = [];
  let i = 0;
  while (i < items.length) {
    const entry = items[i];
    if (entry.kind === "link" && isSiblingLabel(entry.label)) {
      const cluster: PrimaryNavLink[] = [];
      while (i < items.length) {
        const cur = items[i];
        if (cur.kind !== "link" || !isSiblingLabel(cur.label)) break;
        cluster.push(cur);
        i += 1;
      }
      out.push({ kind: "siblingCluster", items: cluster });
      continue;
    }
    out.push(entry);
    i += 1;
  }
  return out;
}

function stripNestedKnowledgePractice(items: PrimaryNavEntry[]): PrimaryNavEntry[] {
  const out: PrimaryNavEntry[] = [];
  for (const entry of items) {
    if (entry.kind === "link") {
      if (!isSiblingLabel(entry.label)) out.push(entry);
      continue;
    }
    if (isSiblingLabel(entry.label)) continue;
    if (entry.kind === "group") {
      out.push({
        ...entry,
        items: entry.items.filter((item) => !isSiblingLabel(item.label)),
      });
      continue;
    }
    out.push({
      ...entry,
      columns: entry.columns.map((col) => ({
        ...col,
        items: col.items.filter((item) => !isSiblingLabel(item.label)),
      })),
    });
  }
  return out;
}

/** 드롭다운에 묶여 있어도 상단 형제 링크로 다시 펼친다. */
export function sanitizePrimaryNavItems(items: PrimaryNavEntry[]): PrimaryNavEntry[] {
  const cleaned = stripNestedKnowledgePractice(items);
  const knowledge: PrimaryNavEntry = {
    kind: "link",
    href: KNOWLEDGE_NAV.href,
    label: KNOWLEDGE_NAV.label,
    Icon: BookOpen,
  };
  const practice: PrimaryNavEntry = {
    kind: "link",
    href: PRACTICE_NAV.href,
    label: PRACTICE_NAV.label,
    Icon: Briefcase,
  };
  const categoryIdx = cleaned.findIndex(
    (entry) => entry.kind === "group" && entry.label === "분류별",
  );
  const insertAt = categoryIdx >= 0 ? categoryIdx + 1 : Math.min(2, cleaned.length);
  const next = [
    ...cleaned.slice(0, insertAt),
    knowledge,
    practice,
    ...cleaned.slice(insertAt),
  ];
  assertKnowledgeAndPracticeAreSiblingLinks(next);
  return next;
}

/** 청소지식·청소업 실무를 드롭다운 자식으로 넣으면 앱이 바로 실패한다. */
export function assertKnowledgeAndPracticeAreSiblingLinks(
  items: PrimaryNavEntry[],
): void {
  for (const entry of items) {
    if (entry.kind === "link") continue;
    if (isSiblingLabel(entry.label)) {
      throw new Error(
        `[nav] "${entry.label}"는 드롭다운이 아니라 상단 독립 링크여야 합니다.`,
      );
    }
    const children =
      entry.kind === "group"
        ? entry.items
        : entry.columns.flatMap((col) => col.items);
    for (const child of children) {
      if (isSiblingLabel(child.label)) {
        throw new Error(
          `[nav] "${child.label}"를 "${entry.label}" 하위메뉴로 두면 안 됩니다.`,
        );
      }
    }
  }

  for (const label of SIBLING_LABELS) {
    const found = items.find(
      (entry) => entry.kind === "link" && entry.label === label,
    );
    if (!found) {
      throw new Error(`[nav] 상단에 "${label}" 독립 링크가 없습니다.`);
    }
  }
}

/**
 * 데스크톱 가운데 메뉴.
 * 청소지식(/blog)과 청소업 실무(/practice)는 형제 링크 — 한쪽을 다른 쪽 아래로 넣지 말 것.
 */
const RAW_PRIMARY_NAV_ITEMS: PrimaryNavEntry[] = [
  { kind: "link", href: "/", label: "홈", Icon: Home },
  { kind: "link", href: "/places", label: "장소별", Icon: FileText },
  {
    kind: "group",
    label: "분류별",
    Icon: Beaker,
    items: [
      { href: "/products", label: "세정 제품", Icon: Beaker },
      { href: "/materials", label: "재질별", Icon: Layers },
      { href: "/pollution", label: "오염별", Icon: Droplets },
      { href: "/cleaning", label: "레시피", Icon: FlaskConical },
      { href: "/cases", label: "사례", Icon: ClipboardList },
    ],
  },
  {
    kind: "mega",
    label: "청소업체 전용관",
    shortLabel: "전용관",
    Icon: Sparkles,
    columns: [
      {
        title: "주요 기능",
        items: [
          {
            href: magamLiveHref(MAGAM_LIVE_FROM_CLEANIDEX),
            label: "실시간 모집",
            Icon: Radio,
          },
          { href: "/estimate", label: "견적 계산기", Icon: Calculator },
          { href: "/inquiry/regular", label: "정기청소 문의", Icon: Briefcase },
        ],
      },
      {
        title: "데이터분석",
        items: [
          { href: "/tenders", label: "입찰공고", Icon: Gavel },
          { href: "/tender-awards", label: "낙찰공고", Icon: Trophy },
          { href: "/jobs/public", label: "채용 공고", Icon: Landmark },
        ],
      },
      {
        title: "리포트",
        items: [
          { href: "/news?section=report&category=report", label: "입찰", Icon: Gavel },
          {
            href: "/news?section=report&category=award_report",
            label: "낙찰",
            Icon: Trophy,
          },
          { href: "/marketing-report", label: "마케팅", Icon: Sparkles },
          { href: "/job-market-report", label: "일당", Icon: Landmark },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "서비스",
    Icon: Layers,
    adminOnly: true,
    items: [
      { href: "/listings", label: "현장 마켓", Icon: Briefcase },
      { href: "/partners", label: "협력 센터", Icon: Handshake },
      { href: "/jobs", label: "인력 센터", Icon: UserPlus },
    ],
  },
];

export const PRIMARY_NAV_ITEMS: PrimaryNavEntry[] =
  sanitizePrimaryNavItems(RAW_PRIMARY_NAV_ITEMS);
