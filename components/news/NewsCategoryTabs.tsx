import Link from "next/link";

export type NewsCategoryKey = "report" | "chemical" | "equipment" | "labor" | "industry";

const TABS: { key: NewsCategoryKey; label: string; href: string }[] = [
  { key: "report", label: "입찰 리포트", href: "/news?category=report" },
  { key: "chemical", label: "약품", href: "/news?category=chemical" },
  { key: "equipment", label: "장비", href: "/news?category=equipment" },
  { key: "labor", label: "근로", href: "/news?category=labor" },
  { key: "industry", label: "업계이슈", href: "/news?category=industry" },
];

type Props = { current: NewsCategoryKey };

export default function NewsCategoryTabs({ current }: Props) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/80 p-1"
      aria-label="업계 소식 카테고리"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            current === tab.key
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
