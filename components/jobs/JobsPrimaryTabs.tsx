import Link from "next/link";

type PrimaryKey = "all" | "posted" | "applied" | "matches";

type Props = {
  active: PrimaryKey;
  allHref: string;
  postedHref: string;
  appliedHref: string;
  matchesHref: string;
};

export default function JobsPrimaryTabs({
  active,
  allHref,
  postedHref,
  appliedHref,
  matchesHref,
}: Props) {
  const items: { key: PrimaryKey; label: string; href: string }[] = [
    { key: "all", label: "전체", href: allHref },
    { key: "posted", label: "내 구인 관리", href: postedHref },
    { key: "applied", label: "내가 지원한 현장", href: appliedHref },
    { key: "matches", label: "내 매칭", href: matchesHref },
  ];

  return (
    <nav className="mt-4 flex gap-1 rounded-xl bg-slate-100/80 p-1" aria-label="구인 상위 메뉴">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            active === item.key
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

