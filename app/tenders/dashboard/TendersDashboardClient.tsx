"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type CategoryFilter = "all" | "cleaning" | "disinfection" | "both";

type Item = {
  id: string;
  bid_ntce_nm: string | null;
  ntce_instt_nm: string | null;
  bid_clse_dt: string | null;
  categories?: string[] | null;
};

function dday(clseDt: string | null): string {
  if (!clseDt) return "";
  const end = new Date(clseDt).getTime();
  const day = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
  if (day < 0) return "마감";
  if (day === 0) return "D-Day";
  return `D-${day}`;
}

const LABELS: Record<CategoryFilter, string> = {
  all: "전체",
  cleaning: "청소만",
  disinfection: "소독·방역만",
  both: "청소+소독·방역",
};

export default function TendersDashboardClient({
  currentCategory,
  closingSoon,
}: {
  currentCategory: CategoryFilter;
  closingSoon: Item[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setCategory(cat: CategoryFilter) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("category", cat);
    router.push(`/tenders/dashboard?${nextParams.toString()}`);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">마감 임박 (24~72시간)</h2>
        <div className="flex flex-wrap gap-2">
          {(["both", "cleaning", "disinfection", "all"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded border px-2 py-1 text-xs font-medium ${
                currentCategory === cat
                  ? "border-slate-600 bg-slate-100 text-slate-800"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {LABELS[cat]}
            </button>
          ))}
        </div>
      </div>
      {!closingSoon.length ? (
        <p className="text-slate-500">해당 기간 내 마감 공고가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {closingSoon.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tenders/${t.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{t.bid_ntce_nm || "(제목 없음)"}</span>
                <span className="text-sm text-slate-500">{t.ntce_instt_nm}</span>
                <span className="text-sm font-medium text-red-600">{dday(t.bid_clse_dt)}</span>
                <span className="text-sm text-slate-500">
                  {t.bid_clse_dt ? new Date(t.bid_clse_dt).toLocaleString("ko-KR") : ""}
                </span>
                <span className="flex gap-1">
                  {t.categories?.includes("cleaning") && (
                    <span className="rounded bg-emerald-100 px-1.5 text-xs text-emerald-800">청소</span>
                  )}
                  {t.categories?.includes("disinfection") && (
                    <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">소독·방역</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
