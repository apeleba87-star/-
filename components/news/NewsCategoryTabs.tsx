import Link from "next/link";

export type NewsCategoryKey =
  | "report"
  | "award_report"
  | "marketing"
  | "job_wage"
  | "chemical"
  | "equipment"
  | "labor"
  | "industry"
  | "private";

const TABS: { key: Exclude<NewsCategoryKey, "private">; label: string; href: string }[] = [
  { key: "report", label: "입찰 리포트", href: "/news?category=report" },
  { key: "award_report", label: "낙찰 리포트", href: "/news?category=award_report" },
  { key: "marketing", label: "마케팅 리포트", href: "/marketing-report" },
  { key: "job_wage", label: "일당 리포트", href: "/job-market-report" },
  { key: "chemical", label: "약품", href: "/news?category=chemical" },
  { key: "equipment", label: "장비", href: "/news?category=equipment" },
  { key: "labor", label: "근로", href: "/news?category=labor" },
  { key: "industry", label: "업계이슈", href: "/news?category=industry" },
];

type Props = { current: NewsCategoryKey; showPrivateTab?: boolean };

export default function NewsCategoryTabs({ current, showPrivateTab }: Props) {
  const tabs = [
    ...TABS,
    ...(showPrivateTab ? [{ key: "private" as const, label: "비공개", href: "/news?category=private" }] : []),
  ];
  return (
    <nav
      className="flex gap-1.5 rounded-xl border border-slate-200/80 bg-white/60 p-1.5 scrollbar-thin max-md:flex-nowrap max-md:overflow-x-auto md:flex-wrap md:justify-center"
      aria-label="업계 소식 카테고리"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
            current === tab.key
              ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md"
              : "bg-white text-slate-600 ring-1 ring-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
