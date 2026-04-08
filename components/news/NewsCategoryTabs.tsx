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

export type NewsSectionKey = "report" | "industry";

const REPORT_TABS: { key: Exclude<NewsCategoryKey, "private">; label: string; href: string }[] = [
  { key: "report", label: "입찰", href: "/news?section=report&category=report" },
  { key: "award_report", label: "낙찰", href: "/news?section=report&category=award_report" },
  { key: "marketing", label: "마케팅", href: "/marketing-report" },
  { key: "job_wage", label: "일당", href: "/job-market-report" },
];

const INDUSTRY_TABS: { key: NewsCategoryKey; label: string; href: string }[] = [
  { key: "chemical", label: "약품", href: "/news?section=industry&category=chemical" },
  { key: "equipment", label: "장비", href: "/news?section=industry&category=equipment" },
  { key: "labor", label: "근로", href: "/news?section=industry&category=labor" },
  { key: "industry", label: "업계이슈", href: "/news?section=industry&category=industry" },
];

type Props = {
  section: NewsSectionKey;
  current: NewsCategoryKey;
  showPrivateTab?: boolean;
};

export default function NewsCategoryTabs({ section, current, showPrivateTab }: Props) {
  const industryTabs = [
    ...INDUSTRY_TABS,
    ...(showPrivateTab
      ? [{ key: "private" as const, label: "비공개", href: "/news?section=industry&category=private" }]
      : []),
  ];

  return (
    <div className="space-y-3">
      <nav
        className="flex justify-center gap-2"
        aria-label="리포트 또는 업계 소식"
      >
        <Link
          href="/news?section=report&category=report"
          className={`min-h-[44px] shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            section === "report"
              ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md"
              : "bg-white text-slate-600 ring-1 ring-slate-200/80 hover:bg-slate-50"
          }`}
        >
          리포트
        </Link>
        <Link
          href="/news?section=industry&category=chemical"
          className={`min-h-[44px] shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            section === "industry"
              ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md"
              : "bg-white text-slate-600 ring-1 ring-slate-200/80 hover:bg-slate-50"
          }`}
        >
          업계 소식
        </Link>
      </nav>

      {section === "report" ? (
        <nav
          className="flex gap-1.5 rounded-xl border border-slate-200/80 bg-white/60 p-1.5 scrollbar-thin max-md:flex-nowrap max-md:overflow-x-auto md:flex-wrap md:justify-center"
          aria-label="리포트 유형"
        >
          {REPORT_TABS.map((tab) => (
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
      ) : (
        <nav
          className="flex gap-1.5 rounded-xl border border-slate-200/80 bg-white/60 p-1.5 scrollbar-thin max-md:flex-nowrap max-md:overflow-x-auto md:flex-wrap md:justify-center"
          aria-label="업계 소식 카테고리"
        >
          {industryTabs.map((tab) => (
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
      )}
    </div>
  );
}
