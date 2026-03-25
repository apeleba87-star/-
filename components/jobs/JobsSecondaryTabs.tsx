import Link from "next/link";

export type JobsSecondaryTabItem = {
  key: string;
  label: string;
  href: string;
};

type Props = {
  activeKey: string;
  items: JobsSecondaryTabItem[];
  className?: string;
};

export default function JobsSecondaryTabs({ activeKey, items, className }: Props) {
  if (items.length === 0) return null;
  return (
    <nav
      className={`mt-3 flex flex-wrap items-center gap-2 border-b border-slate-200 ${className ?? ""}`}
      aria-label="구인 하위 메뉴"
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeKey === item.key
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

