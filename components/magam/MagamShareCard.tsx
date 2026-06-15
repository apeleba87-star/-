import Link from "next/link";
import type { MagamListingPublic } from "@/lib/magam/types";
import {
  MAGAM_LISTING_TYPE_LABEL,
  MAGAM_STATUS_LABEL,
} from "@/lib/magam/copy";
import { getMagamListingDisplayRows } from "@/lib/magam/format-listing";
import { formatKrMobilePhone } from "@/lib/format/kr-mobile-phone";
import { formatMagamWhen } from "@/lib/format/kr-datetime";
import ContactButtons from "@/components/listings/ContactButtons";
import MagamListingDisplayRows from "@/components/magam/MagamListingDisplayRows";

type Props = {
  listing: MagamListingPublic;
  highlight?: boolean;
};

export default function MagamShareCard({ listing, highlight }: Props) {
  const isClosed = listing.status === "closed";
  const typeLabel = MAGAM_LISTING_TYPE_LABEL[listing.listing_type];
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
        <span className="ml-auto rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
          {typeLabel}
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
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-500">연락처</span>{" "}
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
    </article>
  );
}

/** 목록용 축약 카드 — 카톡 공유와 같은 필드 순서 */
export function MagamListingListItem({ listing }: { listing: MagamListingPublic }) {
  const typeLabel = MAGAM_LISTING_TYPE_LABEL[listing.listing_type];
  const isClosed = listing.status === "closed";
  const rows = getMagamListingDisplayRows(listing);

  return (
    <Link
      href={`/p/${listing.share_slug}`}
      className="block rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
          {typeLabel}
        </span>
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
  );
}
