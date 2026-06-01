"use client";

import Link from "next/link";
import DemandHitCard from "@/components/demand/DemandHitCard";
import { DemandReveal } from "@/components/demand/DemandReveal";
import type { DemandHit } from "@/lib/demand/types";

export default function DemandRegionExtras({
  gu,
  tenderCount,
  hits,
}: {
  gu: string;
  tenderCount: number;
  hits: DemandHit[];
}) {
  return (
    <div className="space-y-4">
      {hits.length > 0 ? (
        <DemandReveal label="적중 사례" hint={`${hits.length}건`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {hits.map((h) => (
              <DemandHitCard key={h.id} hit={h} />
            ))}
          </div>
          <Link href="/demand/hits" className="mt-2 inline-block text-xs font-semibold text-slate-500 hover:text-teal-700">
            전체 →
          </Link>
        </DemandReveal>
      ) : null}

      {tenderCount > 0 ? (
        <DemandReveal label="공공 입찰" hint={gu}>
          <p className="text-sm text-slate-700">
            진행 <strong>{tenderCount}</strong>건 (더미)
          </p>
          <Link href="/tenders" className="mt-2 inline-block text-sm font-semibold text-teal-700 hover:underline">
            입찰 목록
          </Link>
        </DemandReveal>
      ) : null}
    </div>
  );
}
