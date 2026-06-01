"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import DemandTodayBriefing from "@/components/demand/DemandTodayBriefing";
import DemandMonthlyHub from "@/components/demand/DemandMonthlyHub";

export type DemandHubTab = "today" | "month";

const TABS: { id: DemandHubTab; label: string; desc: string }[] = [
  { id: "today", label: "오늘", desc: "일간" },
  { id: "month", label: "이번 달", desc: "월간" },
];

export default function DemandHubTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const active: DemandHubTab = tabParam === "month" ? "month" : "today";

  function setTab(tab: DemandHubTab) {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "today") next.delete("tab");
    else next.set("tab", tab);
    const q = next.toString();
    router.replace(q ? `/demand?${q}` : "/demand", { scroll: false });
  }

  return (
    <div>
      <div
        className="mb-8 flex gap-1 rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm ring-1 ring-slate-100/80"
        role="tablist"
        aria-label="입주수요 보기"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-11 flex-1 rounded-xl px-3 py-2 text-center transition sm:px-4",
              active === t.id
                ? "bg-teal-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <span className="block text-sm font-bold">{t.label}</span>
            <span
              className={cn(
                "mt-0.5 block text-[10px] font-medium sm:text-xs",
                active === t.id ? "text-teal-100" : "text-slate-400"
              )}
            >
              {t.desc}
            </span>
          </button>
        ))}
      </div>

      {active === "today" ? <DemandTodayBriefing onGoMonth={() => setTab("month")} /> : <DemandMonthlyHub />}
    </div>
  );
}
