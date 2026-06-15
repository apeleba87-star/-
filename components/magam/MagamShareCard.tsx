import Link from "next/link";
import type { MagamListingPublic } from "@/lib/magam/types";
import {
  MAGAM_STATUS_LABEL,
} from "@/lib/magam/copy";
import { formatMagamListingPeekBody, getMagamListingDisplayRows } from "@/lib/magam/format-listing";
import { magamListingTypeAccent } from "@/lib/magam/listing-type-style";
import { formatKrMobilePhone } from "@/lib/format/kr-mobile-phone";
import { formatMagamWhen } from "@/lib/format/kr-datetime";
import ContactButtons from "@/components/listings/ContactButtons";
import MagamListingDisplayRows from "@/components/magam/MagamListingDisplayRows";
import MagamReportListingButton from "@/components/magam/MagamReportListingButton";
import { MagamTypeBadge } from "@/components/magam/ui/MagamUi";
import { cn } from "@/lib/utils";

type Props = {
  listing: MagamListingPublic;
  highlight?: boolean;
};

export default function MagamShareCard({ listing, highlight }: Props) {
  const isClosed = listing.status === "closed";
  const rows = getMagamListingDisplayRows(listing);

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        highlight ? "border-slate-300 ring-1 ring-slate-200" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isClosed ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {MAGAM_STATUS_LABEL[listing.status]}
        </span>
        <span className="ml-auto">
          <MagamTypeBadge listingType={listing.listing_type} muted={isClosed} />
        </span>
      </div>

      <MagamListingDisplayRows rows={rows} />

      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        {isClosed ? (
          <p className="text-sm font-medium text-slate-600">
            마감된 공고입니다. 연락처는 더 이상 제공되지 않습니다.
          </p>
        ) : listing.contact_phone ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-slate-700">
              <span className="font-medium text-slate-500">연락처 </span>
              <span className="font-semibold text-slate-900">
                {formatKrMobilePhone(listing.contact_phone)}
              </span>
            </p>
            <ContactButtons phone={listing.contact_phone} variant="listingDetail" />
          </div>
        ) : (
          <p className="text-sm text-slate-600">연락처를 확인할 수 없습니다.</p>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        등록 {formatMagamWhen(listing.created_at)}
        {listing.closed_at ? ` · 마감 ${formatMagamWhen(listing.closed_at)}` : null}
      </p>

      {!isClosed ? (
        <div className="mt-3 border-t border-slate-100 pt-3 text-center">
          <MagamReportListingButton listingId={listing.id} shareSlug={listing.share_slug} />
        </div>
      ) : null}
    </article>
  );
}

/** 공유 페이지 하단 — 한 줄 요약 */
export function MagamListingPeekItem({ listing }: { listing: MagamListingPublic }) {
  const body = formatMagamListingPeekBody(listing);
  const accent = magamListingTypeAccent(listing.listing_type);

  return (
    <Link
      href={`/p/${listing.share_slug}`}
      className={cn(
        "block rounded-lg px-3 py-2.5 transition",
        accent.peek
      )}
    >
      <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[14px] leading-snug">
        <MagamTypeBadge listingType={listing.listing_type} muted={listing.status === "closed"} />
        {body ? <span className="text-slate-800">{body}</span> : null}
      </span>
    </Link>
  );
}

/** 목록용 축약 카드 — 실시간 모집 등 */
export function MagamListingListItem({ listing }: { listing: MagamListingPublic }) {
  const isClosed = listing.status === "closed";
  const rows = getMagamListingDisplayRows(listing);
  const accent = magamListingTypeAccent(listing.listing_type);

  return (
    <div
      className={cn(
        "relative rounded-xl transition hover:shadow-sm",
        isClosed ? "border border-slate-200 bg-white" : accent.card
      )}
    >
      <Link href={`/p/${listing.share_slug}`} className="block px-4 py-3 pr-14">
        <div className="flex items-center gap-2">
          <MagamTypeBadge listingType={listing.listing_type} muted={isClosed} />
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isClosed ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {MAGAM_STATUS_LABEL[listing.status]}
          </span>
        </div>
        <MagamListingDisplayRows rows={rows} compact />
      </Link>
      {!isClosed ? (
        <div className="absolute right-3 top-3">
          <MagamReportListingButton
            listingId={listing.id}
            shareSlug={listing.share_slug}
            compact
          />
        </div>
      ) : null}
    </div>
  );
}
