"use client";

import Link from "next/link";
import { DemandReveal } from "@/components/demand/DemandReveal";
import type { DemandDistrictScore } from "@/lib/demand/types";
import { guNameToSlug } from "@/lib/demand/slugs";

export default function DemandExplorationLinks({ district }: { district: DemandDistrictScore }) {
  const { similarGu, neighborRanks } = district.drilldownExtra;

  return (
    <DemandReveal label="다른 구 탐색" hint="이웃 순위 · 비슷한 패턴">
      <div className="space-y-4 text-sm">
        {neighborRanks.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {neighborRanks.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`/demand/region/${n.slug}`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-800 hover:border-teal-200"
                >
                  {n.rank}위 {n.gu}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {similarGu.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {similarGu.map((gu) => {
              const slug = guNameToSlug(gu);
              if (!slug) return null;
              return (
                <li key={gu}>
                  <Link
                    href={`/demand/region/${slug}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:border-teal-200"
                  >
                    {gu}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
        <Link
          href={`/demand/compare?gu1=${district.slug}&gu2=${neighborRanks[0]?.slug ?? "yangcheon-gu"}&gu3=${similarGu[0] ? guNameToSlug(similarGu[0]) : "mapo-gu"}`}
          className="font-semibold text-teal-700 hover:underline"
        >
          비교표
        </Link>
      </div>
    </DemandReveal>
  );
}
