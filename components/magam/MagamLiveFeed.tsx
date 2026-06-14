"use client";

import { useMemo, useState } from "react";
import type { MagamListingPublic } from "@/lib/magam/types";
import { MagamListingListItem } from "@/components/magam/MagamShareCard";
import {
  MAGAM_LIVE_TYPES,
  MAGAM_PRICE_BUCKETS,
  collectMagamRegions,
  filterMagamLiveListings,
  type MagamLiveListingType,
  type MagamPriceBucket,
} from "@/lib/magam/format-listing";

const TYPE_FILTERS: { value: "all" | MagamLiveListingType; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "subcontract", label: "도급" },
  { value: "hiring", label: "구인" },
];

type Props = {
  initialListings: MagamListingPublic[];
};

function ListingSection({
  title,
  listings,
}: {
  title: string;
  listings: MagamListingPublic[];
}) {
  if (listings.length === 0) return null;

  return (
    <section className="mt-6 first:mt-4">
      <h2 className="mb-3 flex items-baseline gap-2 border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
        {title}
        <span className="text-xs font-normal text-slate-500">{listings.length}건</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {listings.map((item) => (
          <li key={item.id}>
            <MagamListingListItem listing={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

const selectClass =
  "w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";

export default function MagamLiveFeed({ initialListings }: Props) {
  const [typeFilter, setTypeFilter] = useState<"all" | MagamLiveListingType>("all");
  const [regionFilter, setRegionFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState<MagamPriceBucket>("all");

  const liveListings = useMemo(
    () => initialListings.filter((l) => MAGAM_LIVE_TYPES.includes(l.listing_type as MagamLiveListingType)),
    [initialListings]
  );

  const regions = useMemo(() => collectMagamRegions(liveListings), [liveListings]);

  const filtered = useMemo(
    () =>
      filterMagamLiveListings(liveListings, {
        type: typeFilter,
        region: regionFilter,
        priceBucket: priceFilter,
      }),
    [liveListings, typeFilter, regionFilter, priceFilter]
  );

  const subcontractListings = useMemo(
    () => filtered.filter((l) => l.listing_type === "subcontract"),
    [filtered]
  );
  const hiringListings = useMemo(
    () => filtered.filter((l) => l.listing_type === "hiring"),
    [filtered]
  );

  const hasActiveFilter = typeFilter !== "all" || regionFilter !== "" || priceFilter !== "all";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">지역</span>
          <select
            className={selectClass}
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            aria-label="지역 필터"
          >
            <option value="">지역 전체</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">금액</span>
          <select
            className={selectClass}
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value as MagamPriceBucket)}
            aria-label="금액 필터"
          >
            {MAGAM_PRICE_BUCKETS.map((bucket) => (
              <option key={bucket.value} value={bucket.value}>
                {bucket.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hasActiveFilter && (
        <p className="mt-3 text-xs text-slate-500">
          {filtered.length}건 표시
          {regionFilter ? ` · ${regionFilter}` : ""}
          {priceFilter !== "all"
            ? ` · ${MAGAM_PRICE_BUCKETS.find((b) => b.value === priceFilter)?.label}`
            : ""}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">조건에 맞는 모집 공고가 없습니다.</p>
      ) : typeFilter === "all" ? (
        <>
          <ListingSection title="도급" listings={subcontractListings} />
          <ListingSection title="구인" listings={hiringListings} />
        </>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <MagamListingListItem listing={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
