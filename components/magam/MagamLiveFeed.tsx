"use client";

import { useMemo, useState } from "react";
import type { MagamListingPublic, MagamListingType } from "@/lib/magam/types";
import { MAGAM_LISTING_TYPE_LABEL } from "@/lib/magam/copy";
import { MagamListingListItem } from "@/components/magam/MagamShareCard";

const FILTERS: { value: "all" | MagamListingType; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "subcontract", label: "도급" },
  { value: "hiring", label: "구인" },
  { value: "trade", label: "매매" },
];

type Props = {
  initialListings: MagamListingPublic[];
};

export default function MagamLiveFeed({ initialListings }: Props) {
  const [typeFilter, setTypeFilter] = useState<"all" | MagamListingType>("all");

  const filtered = useMemo(() => {
    if (typeFilter === "all") return initialListings;
    return initialListings.filter((l) => l.listing_type === typeFilter);
  }, [initialListings, typeFilter]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              typeFilter === f.value
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">모집 중인 공고가 없습니다.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <MagamListingListItem listing={item} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-slate-400">
        유형: {Object.entries(MAGAM_LISTING_TYPE_LABEL).map(([k, v]) => v).join(" · ")}
      </p>
    </div>
  );
}
