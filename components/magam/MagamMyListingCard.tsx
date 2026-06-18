"use client";

import {
  MAGAM_LISTING_TYPE_LABEL,
  MAGAM_STATUS_LABEL,
} from "@/lib/magam/copy";
import {
  formatMagamScheduleWithTime,
  getMagamListingDisplayRows,
} from "@/lib/magam/format-listing";
import type { MagamListingRow } from "@/lib/magam/types";
import { MagamStatusBadge, MagamTypeBadge } from "@/components/magam/ui/MagamUi";
import { MagamTapLink } from "@/components/magam/ui/MagamTouchNav";
import { cn } from "@/lib/utils";

type Props = {
  listing: MagamListingRow;
  href: string;
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function compactRowValue(label: string, value: string): string {
  if (label !== "상세 설명" && label !== "특이사항") return value;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return value;
  return normalized.length > 58 ? `${normalized.slice(0, 58).trim()}...` : normalized;
}

export default function MagamMyListingCard({ listing, href }: Props) {
  const isOpen = listing.status === "open";
  const scheduleHeadline = formatMagamScheduleWithTime(listing);
  const rows = getMagamListingDisplayRows(listing).filter(
    (row) => !scheduleHeadline || row.label !== "일정"
  );
  const meta = !isOpen && listing.closed_at
    ? `마감 ${shortDate(listing.closed_at)}`
    : `등록 ${shortDate(listing.created_at)}`;

  return (
    <MagamTapLink
      href={href}
      className={cn(
        "rounded-[18px] border p-4",
        isOpen
          ? "border-[#E3E6EC] bg-white active:bg-[#F8F9FB]"
          : "border-[#E5E7EB] bg-[#F3F4F6] active:bg-[#E8EAED]"
      )}
    >
      <div className="flex items-center gap-2">
        <MagamTypeBadge
          listingType={listing.listing_type}
          hiringEmploymentType={listing.hiring_employment_type}
          tradeSide={listing.trade_side}
          muted={!isOpen}
        />
        <span className="ml-auto">
          <MagamStatusBadge
            label={MAGAM_STATUS_LABEL[listing.status]}
            isOpen={isOpen}
          />
        </span>
      </div>
      {scheduleHeadline ? (
        <p className={`mt-2.5 text-sm font-bold ${isOpen ? "text-[#141824]" : "text-[#5B6472]"}`}>
          {scheduleHeadline}
        </p>
      ) : null}
      {rows.length > 0 ? (
        <dl className="mt-2.5 space-y-1.5">
          {rows.map((row) => (
            <div key={row.label} className="text-[13px] leading-relaxed">
              <span className="font-semibold text-[#5B6472]">{row.label}: </span>
              <span className={isOpen ? "text-[#141824]" : "text-[#5B6472]"}>
                {compactRowValue(row.label, row.value)}
              </span>
            </div>
          ))}
        </dl>
      ) : (
        <p className={`mt-2.5 line-clamp-2 text-[13px] ${isOpen ? "text-[#141824]" : "text-[#5B6472]"}`}>
          {listing.body_text}
        </p>
      )}
      <p className="mt-1 text-[11px] text-[#8B93A1]">
        {MAGAM_LISTING_TYPE_LABEL[listing.listing_type]} · {meta}
      </p>
    </MagamTapLink>
  );
}
