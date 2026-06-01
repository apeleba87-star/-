import Link from "next/link";
import DemandShell from "@/components/demand/DemandShell";
import DemandSearch from "@/components/demand/DemandSearch";
import { SEOUL_GU_NAMES, guNameToSlug } from "@/lib/demand/slugs";
import { DEMAND_TOP10 } from "@/lib/demand/dummy-data";

export const metadata = {
  title: "지역 검색 | 입주수요 | 클린아이덱스",
};

export default function DemandRegionIndexPage() {
  const topSlugs = new Set(DEMAND_TOP10.map((d) => d.slug));

  return (
    <DemandShell title="지역 검색" subtitle={undefined} searchVariant={false}>
      <DemandSearch variant="hero" autoFocus />

      <details className="mt-8 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-600">서울 25구 목록</summary>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {SEOUL_GU_NAMES.map((gu) => {
            const slug = guNameToSlug(gu);
            if (!slug) return null;
            const ready = topSlugs.has(slug);
            return (
              <li key={gu}>
                {ready ? (
                  <Link href={`/demand/region/${slug}`} className="text-sm text-slate-700 hover:text-teal-800">
                    {gu}
                  </Link>
                ) : (
                  <span className="text-sm text-slate-400">{gu}</span>
                )}
              </li>
            );
          })}
        </ul>
      </details>
    </DemandShell>
  );
}
