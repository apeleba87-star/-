import Link from "next/link";

export type AdminPartnersTab = "register" | "manage" | "performance";

const tabs: { id: AdminPartnersTab; label: string }[] = [
  { id: "register", label: "등록" },
  { id: "manage", label: "수정" },
  { id: "performance", label: "성과" },
];

export default function AdminPartnersTabNav({ active }: { active: AdminPartnersTab }) {
  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1" aria-label="협력센터 관리 구역">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <Link
            key={t.id}
            href={`/admin/partners?tab=${t.id}`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              isActive ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
